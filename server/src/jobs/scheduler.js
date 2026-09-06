import { db, logEvent } from '../db/index.js';
import { attemptPublish } from './publish.js';
import { runRulesForTrigger, evaluatePollableRules } from './rules.js';

const RETRY_BACKOFF_MINUTES = [2, 10, 30]; // by retry_count

let lastTickAt = null;
let lastTickResult = null;

// Atomically claims one due job so two overlapping ticks can never both process it —
// the WHERE status = 'pending' makes this a compare-and-swap, not a race.
function claimNextDueJob() {
  // scheduled_for is stored as whatever ISO string the client sent (T/Z separators);
  // datetime('now') returns SQLite's own "YYYY-MM-DD HH:MM:SS" format. Wrapping both
  // sides in datetime() normalizes them before comparing — comparing the raw strings
  // is wrong (ASCII 'T' > ' ', so an ISO string never looks "due" as plain text).
  const due = db.prepare(`
    SELECT * FROM scheduled_jobs
    WHERE status = 'pending' AND datetime(scheduled_for) <= datetime('now')
    ORDER BY scheduled_for ASC
    LIMIT 1
  `).get();
  if (!due) return null;

  const claim = db.prepare(`UPDATE scheduled_jobs SET status = 'publishing', updated_at = datetime('now') WHERE id = ? AND status = 'pending'`).run(due.id);
  if (claim.changes === 0) return null; // another tick claimed it first
  return due;
}

async function processJob(job) {
  const content = db.prepare('SELECT * FROM content WHERE id = ?').get(job.content_id);
  const platform = db.prepare('SELECT * FROM platforms WHERE id = ?').get(job.platform_id);

  const result = await attemptPublish({ job, content, platform });

  // job_id is UNIQUE on publishing_results, so a duplicate write for the same job
  // fails loudly instead of silently double-recording a publish.
  db.prepare(`
    INSERT INTO publishing_results (job_id, success, external_post_id, external_url, error_message)
    VALUES (?, ?, ?, ?, ?)
  `).run(job.id, result.success ? 1 : 0, result.externalPostId ?? null, result.externalUrl ?? null, result.error ?? null);

  if (result.success) {
    db.prepare(`UPDATE scheduled_jobs SET status = 'published', updated_at = datetime('now') WHERE id = ?`).run(job.id);
    db.prepare(`UPDATE content SET status = 'published', updated_at = datetime('now') WHERE id = ?`).run(job.content_id);
    logEvent({
      event_type: 'PUBLISH_SUCCESS',
      severity: 'success',
      entity_type: 'job',
      entity_id: job.id,
      message: `${content.title} -> ${platform.display_name}${result.simulated ? ' (simulated)' : ''}`,
    });
    runRulesForTrigger('content_published', { content, platform });
  } else {
    const nextRetry = job.retry_count + 1;
    if (nextRetry <= job.max_retries) {
      const backoffMin = RETRY_BACKOFF_MINUTES[Math.min(job.retry_count, RETRY_BACKOFF_MINUTES.length - 1)];
      db.prepare(`
        UPDATE scheduled_jobs
        SET status = 'pending', retry_count = ?, last_error = ?, scheduled_for = datetime('now', '+' || ? || ' minutes'), updated_at = datetime('now')
        WHERE id = ?
      `).run(nextRetry, result.error, backoffMin, job.id);
      logEvent({ event_type: 'PUBLISH_RETRY_SCHEDULED', severity: 'warning', entity_type: 'job', entity_id: job.id, message: `attempt ${nextRetry}/${job.max_retries} in ${backoffMin}m — ${result.error}` });
    } else {
      db.prepare(`UPDATE scheduled_jobs SET status = 'failed', last_error = ?, updated_at = datetime('now') WHERE id = ?`).run(result.error, job.id);
      db.prepare(`UPDATE content SET status = 'failed', updated_at = datetime('now') WHERE id = ?`).run(job.content_id);
      logEvent({ event_type: 'PUBLISH_FAILED', severity: 'error', entity_type: 'job', entity_id: job.id, message: `${content.title} -> ${platform.display_name}: ${result.error}` });
    }
  }
}

export async function runSchedulerTick() {
  const processed = [];
  // Bounded loop: process due jobs one at a time so a burst doesn't block the tick forever.
  for (let i = 0; i < 20; i++) {
    const job = claimNextDueJob();
    if (!job) break;
    await processJob(job);
    processed.push(job.id);
  }
  evaluatePollableRules();
  lastTickAt = new Date().toISOString();
  lastTickResult = { processed: processed.length };
  return lastTickResult;
}

export function startScheduler(intervalMs = 60_000) {
  // Requeue any job stuck mid-publish from a previous crash before the loop starts.
  db.prepare(`UPDATE scheduled_jobs SET status = 'pending', updated_at = datetime('now') WHERE status = 'publishing'`).run();
  runSchedulerTick();
  return setInterval(runSchedulerTick, intervalMs);
}

export function getSchedulerStatus() {
  const nextJob = db.prepare(`SELECT scheduled_for FROM scheduled_jobs WHERE status = 'pending' ORDER BY scheduled_for ASC LIMIT 1`).get();
  const failedCount = db.prepare(`SELECT COUNT(*) AS n FROM scheduled_jobs WHERE status = 'failed'`).get().n;
  const pendingCount = db.prepare(`SELECT COUNT(*) AS n FROM scheduled_jobs WHERE status = 'pending'`).get().n;
  return {
    lastTickAt,
    lastTickResult,
    nextScheduledFor: nextJob?.scheduled_for ?? null,
    failedJobs: failedCount,
    pendingJobs: pendingCount,
  };
}
