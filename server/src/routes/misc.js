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

miscRouter.get('/platforms', (req, res) => {
  res.json(db.prepare('SELECT * FROM platforms ORDER BY display_name').all());
});

miscRouter.get('/events', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(db.prepare('SELECT * FROM automation_events ORDER BY created_at DESC LIMIT ?').all(limit));
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
