import { Router } from 'express';
import { db, logEvent } from '../db/index.js';
import { ADAPTERS } from '../jobs/publish.js';
import * as githubAdapter from '../adapters/github.js';

export const miscRouter = Router();

const CONNECTION_TESTERS = { ...ADAPTERS, github: githubAdapter };

miscRouter.get('/pillars', (req, res) => {
  res.json(db.prepare('SELECT * FROM content_pillars ORDER BY name').all());
});

miscRouter.post('/pillars', (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name_required' });
  const result = db.prepare('INSERT INTO content_pillars (name, description, color) VALUES (?, ?, ?)').run(name, description ?? null, color ?? null);
  res.status(201).json(db.prepare('SELECT * FROM content_pillars WHERE id = ?').get(result.lastInsertRowid));
});

miscRouter.get('/tags', (req, res) => {
  res.json(db.prepare('SELECT * FROM tags ORDER BY name').all());
});

miscRouter.get('/platforms', (req, res) => {
  res.json(db.prepare('SELECT * FROM platforms ORDER BY display_name').all());
});

miscRouter.post('/platforms/:slug/test-connection', async (req, res) => {
  const platform = db.prepare('SELECT * FROM platforms WHERE slug = ?').get(req.params.slug);
  if (!platform) return res.status(404).json({ error: 'not_found' });

  const tester = CONNECTION_TESTERS[req.params.slug];
  if (!tester?.testConnection) {
    return res.status(400).json({ error: 'not_supported', message: 'This platform is manual-assist only — there is no API connection to test.' });
  }

  const result = await tester.testConnection();
  // "not set" means unconfigured (expected on a fresh clone), not a broken connection —
  // only a real failed attempt should show as an error state.
  const status = result.connected ? 'connected' : /not set/.test(result.reason ?? '') ? 'disconnected' : 'error';
  db.prepare(`UPDATE platforms SET connection_status = ?, last_checked_at = datetime('now') WHERE id = ?`)
    .run(status, platform.id);
  logEvent({
    event_type: 'PLATFORM_CONNECTION_TESTED',
    entity_type: 'platform',
    entity_id: platform.id,
    message: `${platform.display_name}: ${result.connected ? `connected as ${result.account}` : result.reason}`,
  });
  res.json(result);
});

miscRouter.get('/events', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { event_type, severity, entity_type } = req.query;
  let sql = `SELECT * FROM automation_events WHERE 1=1`;
  const params = [];
  if (event_type) {
    sql += ` AND event_type = ?`;
    params.push(event_type);
  }
  if (severity) {
    sql += ` AND severity = ?`;
    params.push(severity);
  }
  if (entity_type) {
    sql += ` AND entity_type = ?`;
    params.push(entity_type);
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  res.json(db.prepare(sql).all(...params));
});

miscRouter.get('/events/types', (req, res) => {
  res.json(db.prepare('SELECT DISTINCT event_type FROM automation_events ORDER BY event_type').all().map((r) => r.event_type));
});

miscRouter.get('/config', (req, res) => {
  res.json(db.prepare('SELECT * FROM config WHERE id = 1').get());
});

miscRouter.patch('/config', (req, res) => {
  const fields = ['brand_name', 'bio', 'website', 'github_url', 'linkedin_url', 'tone', 'default_hashtags', 'cta_preference'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.json(db.prepare('SELECT * FROM config WHERE id = 1').get());
  updates.push(`updated_at = datetime('now')`);
  db.prepare(`UPDATE config SET ${updates.join(', ')} WHERE id = 1`).run(...params);
  res.json(db.prepare('SELECT * FROM config WHERE id = 1').get());
});

miscRouter.get('/experiments', (req, res) => {
  res.json(db.prepare('SELECT * FROM experiments ORDER BY created_at DESC').all());
});

const EXPERIMENT_FIELDS = ['name', 'goal', 'trigger_desc', 'input_desc', 'processing_desc', 'output_desc', 'api_used', 'automation_used', 'status', 'learnings'];
const EXPERIMENT_STATUSES = ['planned', 'in_progress', 'working', 'abandoned'];

miscRouter.post('/experiments', (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'name_required' });
  const values = EXPERIMENT_FIELDS.map((f) => req.body[f] ?? (f === 'status' ? 'planned' : null));
  const result = db.prepare(`
    INSERT INTO experiments (${EXPERIMENT_FIELDS.join(', ')})
    VALUES (${EXPERIMENT_FIELDS.map(() => '?').join(', ')})
  `).run(...values);
  res.status(201).json(db.prepare('SELECT * FROM experiments WHERE id = ?').get(result.lastInsertRowid));
});

miscRouter.patch('/experiments/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM experiments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const updates = [];
  const params = [];
  for (const f of EXPERIMENT_FIELDS) {
    if (req.body[f] !== undefined) {
      if (f === 'status' && !EXPERIMENT_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: 'invalid_status', allowed: EXPERIMENT_STATUSES });
      }
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.json(existing);
  updates.push(`updated_at = datetime('now')`);
  params.push(req.params.id);
  db.prepare(`UPDATE experiments SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM experiments WHERE id = ?').get(req.params.id));
});
