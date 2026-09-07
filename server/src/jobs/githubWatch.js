// Polls GitHub for new releases and turns each one into a reviewable content idea.
// This is the 'github_release' automation rule made real — gated by both the rule's
// enabled flag and GITHUB_USERNAME being set, so it's silent (not fake) when unconfigured.
import { db, logEvent } from '../db/index.js';
import { fetchRecentReleases } from '../adapters/github.js';

const POLL_INTERVAL_MS = 5 * 60_000;
let lastPolledAt = 0;

export async function pollGithubReleases({ force = false } = {}) {
  const username = process.env.GITHUB_USERNAME;
  if (!username) return { skipped: true, reason: 'GITHUB_USERNAME not set' };

  const rule = db.prepare(`SELECT * FROM automation_rules WHERE trigger_type = 'github_release' AND enabled = 1`).get();
  if (!rule) return { skipped: true, reason: 'rule disabled' };

  if (!force && Date.now() - lastPolledAt < POLL_INTERVAL_MS) return { skipped: true, reason: 'throttled' };
  lastPolledAt = Date.now();

  let releases;
  try {
    releases = await fetchRecentReleases(username);
  } catch (err) {
    logEvent({ event_type: 'GITHUB_POLL_FAILED', severity: 'error', message: err.message });
    return { error: err.message };
  }

  let created = 0;
  for (const rel of releases) {
    // The idempotency ledger, not "did I see this recently" — a poll running twice,
    // or restarting mid-poll, can never create the same idea from the same release twice.
    const alreadyProcessed = db.prepare(`SELECT 1 FROM processed_external_events WHERE source = 'github' AND external_id = ?`).get(rel.id);
    if (alreadyProcessed) continue;

    const title = `${rel.repo.split('/')[1] ?? rel.repo} released ${rel.tag}`;
    const result = db.prepare(`
      INSERT INTO content (title, hook, body, status, source_type, source_url)
      VALUES (?, ?, ?, 'idea', 'github_activity', ?)
    `).run(title, rel.name, `New release detected: ${rel.repo} ${rel.tag}`, rel.url);

    db.prepare(`INSERT INTO processed_external_events (source, external_id, content_id) VALUES ('github', ?, ?)`).run(rel.id, result.lastInsertRowid);

    logEvent({
      event_type: 'CONTENT_CREATED',
      entity_type: 'content',
      entity_id: result.lastInsertRowid,
      message: `${title} (from GitHub release, rule: ${rule.name})`,
    });
    created++;
  }

  return { created, checked: releases.length };
}
