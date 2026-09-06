import { Router } from 'express';
import crypto from 'node:crypto';
import { db, logEvent } from '../db/index.js';
import { runSchedulerTick, getSchedulerStatus } from '../jobs/scheduler.js';

export const jobsRouter = Router();

jobsRouter.get('/calendar', (req, res) => {
  let sql = `
    SELECT j.*, c.title AS content_title, p.slug AS platform_slug, p.display_name AS platform_name
    FROM scheduled_jobs j
    JOIN content c ON c.id = j.content_id
    JOIN platforms p ON p.id = j.platform_id
    WHERE 1=1
  `;
  const params = [];
  if (req.query.content_id) {
    sql += ` AND j.content_id = ?`;
    params.push(req.query.content_id);
  }
  sql += ` ORDER BY j.scheduled_for ASC`;
  res.json(db.prepare(sql).all(...params));
});

jobsRouter.post('/schedule', (req, res) => {
  const { content_id, platform_id, scheduled_for, dry_run } = req.body;
  if (!content_id || !platform_id || !scheduled_for) {
    return res.status(400).json({ error: 'content_id_platform_id_scheduled_for_required' });
  }

  const content = db.prepare('SELECT * FROM content WHERE id = ?').get(content_id);
  if (!content) return res.status(404).json({ error: 'content_not_found' });
  if (content.status !== 'approved') {
    return res.status(400).json({ error: 'content_not_approved', message: 'Only approved content can be scheduled.' });
  }

  const platform = db.prepare('SELECT * FROM platforms WHERE id = ?').get(platform_id);
  if (!platform) return res.status(404).json({ error: 'platform_not_found' });

  const idempotencyKey = crypto.randomUUID();
  const isDryRun = dry_run !== undefined ? (dry_run ? 1 : 0) : (process.env.DRY_RUN !== 'false' ? 1 : 0);

  const result = db.prepare(`
    INSERT INTO scheduled_jobs (idempotency_key, content_id, platform_id, scheduled_for, dry_run)
    VALUES (?, ?, ?, ?, ?)
  `).run(idempotencyKey, content_id, platform_id, scheduled_for, isDryRun);

  db.prepare(`UPDATE content SET status = 'scheduled', updated_at = datetime('now') WHERE id = ?`).run(content_id);

  logEvent({
    event_type: 'JOB_SCHEDULED',
    entity_type: 'job',
    entity_id: result.lastInsertRowid,
    message: `${content.title} -> ${platform.display_name} at ${scheduled_for}${isDryRun ? ' (dry run)' : ''}`,
  });

  res.status(201).json(db.prepare('SELECT * FROM scheduled_jobs WHERE id = ?').get(result.lastInsertRowid));
});

jobsRouter.delete('/schedule/:jobId', (req, res) => {
  const job = db.prepare('SELECT * FROM scheduled_jobs WHERE id = ?').get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'not_found' });
  if (job.status !== 'pending') {
    return res.status(400).json({ error: 'cannot_cancel', message: 'Only pending jobs can be cancelled.' });
  }

  db.prepare(`UPDATE scheduled_jobs SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(job.id);
  db.prepare(`UPDATE content SET status = 'approved', updated_at = datetime('now') WHERE id = ?`).run(job.content_id);
  logEvent({ event_type: 'JOB_CANCELLED', entity_type: 'job', entity_id: job.id });

  res.status(204).end();
});

jobsRouter.post('/automation/run', async (req, res) => {
  const result = await runSchedulerTick();
  res.json(result);
});

jobsRouter.get('/automation/status', (req, res) => {
  res.json(getSchedulerStatus());
});
