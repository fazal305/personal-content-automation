import { Router } from 'express';
import { db } from '../db/index.js';

export const analyticsRouter = Router();

// Latest metric snapshot per (content, platform) — a poll can run many times,
// only the most recent set of numbers per pair matters for the dashboard.
function latestSnapshotRows() {
  return db.prepare(`
    SELECT s.content_id, s.platform_id, s.metric_name, s.metric_value
    FROM analytics_snapshots s
    JOIN (
      SELECT content_id, platform_id, MAX(collected_at) AS latest_at
      FROM analytics_snapshots
      GROUP BY content_id, platform_id
    ) latest ON latest.content_id = s.content_id AND latest.platform_id = s.platform_id AND latest.latest_at = s.collected_at
  `).all();
}

function engagementTotal(metrics) {
  // Sum whatever engagement-shaped metrics the platform actually returned —
  // different platforms name/offer different fields, so this stays generic.
  return (metrics.likes ?? 0) + (metrics.shares ?? 0) + (metrics.comments ?? 0);
}

analyticsRouter.get('/analytics/overview', (req, res) => {
  const totalPublished = db.prepare(`SELECT COUNT(*) AS n FROM content WHERE status = 'published'`).get().n;

  const byPlatform = db.prepare(`
    SELECT p.id, p.display_name, p.supports_analytics, COUNT(pr.id) AS published_count
    FROM platforms p
    LEFT JOIN scheduled_jobs sj ON sj.platform_id = p.id
    LEFT JOIN publishing_results pr ON pr.job_id = sj.id AND pr.success = 1
    GROUP BY p.id
    ORDER BY p.display_name
  `).all();

  const byPillar = db.prepare(`
    SELECT COALESCE(cp.name, 'No pillar') AS pillar, COUNT(*) AS n
    FROM content c LEFT JOIN content_pillars cp ON cp.id = c.pillar_id
    WHERE c.status = 'published'
    GROUP BY pillar
    ORDER BY n DESC
  `).all();

  const snapshotRows = latestSnapshotRows();
  const byContentPlatform = new Map(); // "contentId:platformId" -> { metrics }
  for (const row of snapshotRows) {
    const key = `${row.content_id}:${row.platform_id}`;
    if (!byContentPlatform.has(key)) byContentPlatform.set(key, { content_id: row.content_id, platform_id: row.platform_id, metrics: {} });
    byContentPlatform.get(key).metrics[row.metric_name] = row.metric_value;
  }

  const entries = [...byContentPlatform.values()].map((e) => ({ ...e, total: engagementTotal(e.metrics) }));
  entries.sort((a, b) => b.total - a.total);

  const contentStmt = db.prepare(`SELECT title FROM content WHERE id = ?`);
  const platformStmt = db.prepare(`SELECT display_name FROM platforms WHERE id = ?`);

  const topContent = entries.slice(0, 5).map((e) => ({
    content_id: e.content_id,
    title: contentStmt.get(e.content_id)?.title ?? '(deleted)',
    platform: platformStmt.get(e.platform_id)?.display_name ?? '(unknown)',
    metrics: e.metrics,
    total: e.total,
  }));

  res.json({
    totalPublished,
    hasAnyRealData: snapshotRows.length > 0,
    byPlatform,
    byPillar,
    topContent,
  });
});

analyticsRouter.get('/analytics/content/:id', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, p.display_name AS platform_name
    FROM analytics_snapshots s JOIN platforms p ON p.id = s.platform_id
    WHERE s.content_id = ?
    ORDER BY s.collected_at DESC
  `).all(req.params.id);

  const byPlatform = {};
  for (const row of rows) {
    byPlatform[row.platform_id] ??= { platform: row.platform_name, metrics: {}, collected_at: row.collected_at };
    if (byPlatform[row.platform_id].metrics[row.metric_name] === undefined) {
      byPlatform[row.platform_id].metrics[row.metric_name] = row.metric_value;
    }
  }
  res.json(Object.values(byPlatform));
});
