// Pulls real metrics from platforms that actually offer an analytics API. No
// fabricated numbers: a platform/post with nothing collected simply has no rows
// here, and the UI is expected to say "not available" rather than show a zero.
import { db, logEvent } from '../db/index.js';
import { ADAPTERS } from './publish.js';

const THROTTLE_MINUTES = 60;

export async function syncAnalytics({ force = false } = {}) {
  const rows = db.prepare(`
    SELECT pr.external_post_id, sj.content_id, sj.platform_id, p.slug AS platform_slug
    FROM publishing_results pr
    JOIN scheduled_jobs sj ON sj.id = pr.job_id
    JOIN platforms p ON p.id = sj.platform_id
    WHERE pr.success = 1 AND p.supports_analytics = 1
  `).all();

  let synced = 0;
  for (const row of rows) {
    const adapter = ADAPTERS[row.platform_slug];
    // Dry-run/simulated posts have no real external post to look up — nothing to sync, honestly.
    if (!adapter?.getAnalytics || !row.external_post_id || row.external_post_id.startsWith('dry-run-')) continue;

    if (!force) {
      const recent = db.prepare(`
        SELECT 1 FROM analytics_snapshots
        WHERE content_id = ? AND platform_id = ? AND datetime(collected_at) > datetime('now', '-' || ? || ' minutes')
        LIMIT 1
      `).get(row.content_id, row.platform_id, THROTTLE_MINUTES);
      if (recent) continue;
    }

    try {
      const metrics = await adapter.getAnalytics(row.external_post_id);
      const insert = db.prepare(`INSERT INTO analytics_snapshots (content_id, platform_id, metric_name, metric_value) VALUES (?, ?, ?, ?)`);
      for (const [name, value] of Object.entries(metrics)) {
        if (typeof value === 'number') insert.run(row.content_id, row.platform_id, name, value);
      }
      logEvent({ event_type: 'ANALYTICS_SYNC_SUCCESS', entity_type: 'content', entity_id: row.content_id, message: `${row.platform_slug}: ${JSON.stringify(metrics)}` });
      synced++;
    } catch (err) {
      logEvent({ event_type: 'ANALYTICS_SYNC_FAILED', severity: 'error', entity_type: 'content', entity_id: row.content_id, message: `${row.platform_slug}: ${err.message}` });
    }
  }

  return { synced, checked: rows.length };
}
