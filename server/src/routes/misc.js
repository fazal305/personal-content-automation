import { Router } from 'express';
import { db } from '../db/index.js';

export const miscRouter = Router();

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
