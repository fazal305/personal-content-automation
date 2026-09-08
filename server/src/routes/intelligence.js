import { Router } from 'express';
import { db } from '../db/index.js';

export const intelligenceRouter = Router();

const MIN_SAMPLE_SIZE = 3; // below this, "patterns" are noise, not signal — say so instead of guessing
const MIN_GROUP_SIZE = 2; // a group of 1 isn't a comparison

function engagementTotal(metrics) {
  return (metrics.likes ?? 0) + (metrics.shares ?? 0) + (metrics.comments ?? 0);
}

// One row per (content, platform) with real analytics, carrying its engagement
// total plus the content attributes we might look for patterns across.
function analyzedEntries() {
  const rows = db.prepare(`
    SELECT s.content_id, s.platform_id, s.metric_name, s.metric_value,
           c.content_type, c.pillar_id, cp.name AS pillar_name
    FROM analytics_snapshots s
    JOIN content c ON c.id = s.content_id
    LEFT JOIN content_pillars cp ON cp.id = c.pillar_id
    JOIN (
      SELECT content_id, platform_id, MAX(collected_at) AS latest_at
      FROM analytics_snapshots GROUP BY content_id, platform_id
    ) latest ON latest.content_id = s.content_id AND latest.platform_id = s.platform_id AND latest.latest_at = s.collected_at
  `).all();

  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.content_id}:${row.platform_id}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        content_id: row.content_id,
        content_type: row.content_type,
        pillar_name: row.pillar_name,
        metrics: {},
      });
    }
    byKey.get(key).metrics[row.metric_name] = row.metric_value;
  }
  return [...byKey.values()].map((e) => ({ ...e, total: engagementTotal(e.metrics) }));
}

function groupAverage(entries, keyFn) {
  const groups = new Map();
  for (const e of entries) {
    const key = keyFn(e);
    if (key == null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e.total);
  }
  return [...groups.entries()]
    .map(([key, totals]) => ({ key, count: totals.length, avg: totals.reduce((a, b) => a + b, 0) / totals.length }))
    .filter((g) => g.count >= MIN_GROUP_SIZE)
    .sort((a, b) => b.avg - a.avg);
}

intelligenceRouter.get('/intelligence/insights', (req, res) => {
  const entries = analyzedEntries();

  if (entries.length < MIN_SAMPLE_SIZE) {
    return res.json({
      ready: false,
      sampleSize: entries.length,
      minSampleSize: MIN_SAMPLE_SIZE,
      message: `Not enough published content with real analytics yet to find patterns (${entries.length} of ${MIN_SAMPLE_SIZE} needed). This isn't a guess — the numbers just aren't there yet.`,
      insights: [],
    });
  }

  const byPillar = groupAverage(entries, (e) => e.pillar_name);
  const byType = groupAverage(entries, (e) => e.content_type);

  const insights = [];
  if (byPillar.length >= 2) {
    const [best, ...rest] = byPillar;
    const restAvg = rest.reduce((a, g) => a + g.avg, 0) / rest.length;
    insights.push({
      dimension: 'pillar',
      text: `"${best.key}" content has averaged ${best.avg.toFixed(1)} engagement per post (${best.count} posts) vs ${restAvg.toFixed(1)} for everything else — based on what's been published and measured so far, not a prediction.`,
    });
  }
  if (byType.length >= 2) {
    const [best, ...rest] = byType;
    const restAvg = rest.reduce((a, g) => a + g.avg, 0) / rest.length;
    insights.push({
      dimension: 'content_type',
      text: `"${best.key}" posts have averaged ${best.avg.toFixed(1)} engagement (${best.count} posts) vs ${restAvg.toFixed(1)} for other formats.`,
    });
  }
  if (insights.length === 0) {
    insights.push({ dimension: null, text: `${entries.length} posts have real analytics, but not enough spread across pillars or content types yet for a real comparison.` });
  }

  res.json({ ready: true, sampleSize: entries.length, minSampleSize: MIN_SAMPLE_SIZE, insights, byPillar, byType });
});
