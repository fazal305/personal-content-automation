import { Router } from 'express';
import { db, logEvent } from '../db/index.js';

export const contentRouter = Router();

const LIFECYCLE = ['idea', 'draft', 'in_review', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'archived'];

contentRouter.get('/content', (req, res) => {
  const { status, pillar_id, q } = req.query;
  let sql = `SELECT c.*, p.name AS pillar_name FROM content c LEFT JOIN content_pillars p ON p.id = c.pillar_id WHERE 1=1`;
  const params = [];
  if (status) {
    sql += ` AND c.status = ?`;
    params.push(status);
  }
  if (pillar_id) {
    sql += ` AND c.pillar_id = ?`;
    params.push(pillar_id);
  }
  if (q) {
    sql += ` AND (c.title LIKE ? OR c.body LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ` ORDER BY c.updated_at DESC`;
  res.json(db.prepare(sql).all(...params));
});

contentRouter.get('/content/pipeline-counts', (req, res) => {
  const rows = db.prepare(`SELECT status, COUNT(*) AS count FROM content GROUP BY status`).all();
  const counts = Object.fromEntries(LIFECYCLE.map((s) => [s, 0]));
  for (const row of rows) counts[row.status] = row.count;
  res.json(counts);
});

contentRouter.get('/content/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not_found' });
  res.json(item);
});

contentRouter.post('/content', (req, res) => {
  const { title, hook, body, cta, hashtags, content_type, pillar_id, priority, source_type, source_url, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title_required' });

  const result = db.prepare(`
    INSERT INTO content (title, hook, body, cta, hashtags, content_type, pillar_id, priority, source_type, source_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, hook ?? null, body ?? null, cta ?? null, hashtags ?? null, content_type ?? null, pillar_id ?? null, priority ?? 'normal', source_type ?? 'manual', source_url ?? null, notes ?? null);

  logEvent({ event_type: 'CONTENT_CREATED', entity_type: 'content', entity_id: result.lastInsertRowid, message: title });
  res.status(201).json(db.prepare('SELECT * FROM content WHERE id = ?').get(result.lastInsertRowid));
});

contentRouter.patch('/content/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const fields = ['title', 'hook', 'body', 'cta', 'hashtags', 'content_type', 'pillar_id', 'priority', 'notes', 'status'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if (f === 'status' && !LIFECYCLE.includes(req.body.status)) {
        return res.status(400).json({ error: 'invalid_status', allowed: LIFECYCLE });
      }
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.json(existing);

  updates.push(`updated_at = datetime('now')`);
  params.push(req.params.id);
  db.prepare(`UPDATE content SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  if (req.body.status && req.body.status !== existing.status) {
    logEvent({ event_type: 'CONTENT_STATUS_CHANGED', entity_type: 'content', entity_id: existing.id, message: `${existing.status} -> ${req.body.status}` });
  }
  res.json(db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id));
});

contentRouter.delete('/content/:id', (req, res) => {
  db.prepare('DELETE FROM content WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
