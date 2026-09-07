import { Router } from 'express';
import { db, logEvent } from '../db/index.js';

export const contentRouter = Router();

const LIFECYCLE = ['idea', 'draft', 'in_review', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'archived'];
const FIELDS = ['title', 'hook', 'body', 'cta', 'hashtags', 'content_type', 'target_platform', 'pillar_id', 'priority', 'source_type', 'source_url', 'notes'];

function getTags(contentId) {
  return db.prepare(`
    SELECT t.id, t.name FROM tags t
    JOIN content_tags ct ON ct.tag_id = t.id
    WHERE ct.content_id = ?
    ORDER BY t.name
  `).all(contentId);
}

function syncTags(contentId, tagNames) {
  if (!Array.isArray(tagNames)) return;
  const names = [...new Set(tagNames.map((n) => n.trim()).filter(Boolean))];

  const tagIds = names.map((name) => {
    db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).run(name);
    return db.prepare(`SELECT id FROM tags WHERE name = ?`).get(name).id;
  });

  db.prepare(`DELETE FROM content_tags WHERE content_id = ?`).run(contentId);
  const insert = db.prepare(`INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)`);
  for (const tagId of tagIds) insert.run(contentId, tagId);
}

function withTags(item) {
  if (!item) return item;
  return { ...item, tags: getTags(item.id) };
}

contentRouter.get('/content', (req, res) => {
  const { status, pillar_id, q, tag } = req.query;
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
    sql += ` AND (c.title LIKE ? OR c.body LIKE ? OR c.hook LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (tag) {
    sql += ` AND c.id IN (SELECT ct.content_id FROM content_tags ct JOIN tags t ON t.id = ct.tag_id WHERE t.name = ?)`;
    params.push(tag);
  }
  sql += ` ORDER BY c.updated_at DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(withTags));
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
  res.json(withTags(item));
});

contentRouter.post('/content', (req, res) => {
  const { title, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title_required' });

  const values = FIELDS.map((f) => (f === 'title' ? title : req.body[f] ?? null));
  const priorityIdx = FIELDS.indexOf('priority');
  const sourceTypeIdx = FIELDS.indexOf('source_type');
  values[priorityIdx] = values[priorityIdx] ?? 'normal';
  values[sourceTypeIdx] = values[sourceTypeIdx] ?? 'manual';

  const result = db.prepare(`
    INSERT INTO content (${FIELDS.join(', ')})
    VALUES (${FIELDS.map(() => '?').join(', ')})
  `).run(...values);

  if (tags) syncTags(result.lastInsertRowid, tags);

  logEvent({ event_type: 'CONTENT_CREATED', entity_type: 'content', entity_id: result.lastInsertRowid, message: title });
  res.status(201).json(withTags(db.prepare('SELECT * FROM content WHERE id = ?').get(result.lastInsertRowid)));
});

contentRouter.patch('/content/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const editableFields = [...FIELDS, 'status', 'ai_generated'];
  const updates = [];
  const params = [];
  for (const f of editableFields) {
    if (req.body[f] !== undefined) {
      if (f === 'status' && !LIFECYCLE.includes(req.body.status)) {
        return res.status(400).json({ error: 'invalid_status', allowed: LIFECYCLE });
      }
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (updates.length > 0) {
    updates.push(`updated_at = datetime('now')`);
    params.push(req.params.id);
    db.prepare(`UPDATE content SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  if (req.body.tags !== undefined) syncTags(req.params.id, req.body.tags);

  if (req.body.status && req.body.status !== existing.status) {
    logEvent({ event_type: 'CONTENT_STATUS_CHANGED', entity_type: 'content', entity_id: existing.id, message: `${existing.status} -> ${req.body.status}` });
  }
  res.json(withTags(db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id)));
});

contentRouter.delete('/content/:id', (req, res) => {
  db.prepare('DELETE FROM content WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Platform-specific versions of one master content item (Module: Content Editor / Variants).
contentRouter.get('/content/:id/variants', (req, res) => {
  const rows = db.prepare(`
    SELECT v.*, p.slug AS platform_slug, p.display_name AS platform_name
    FROM content_variants v JOIN platforms p ON p.id = v.platform_id
    WHERE v.content_id = ?
    ORDER BY p.display_name
  `).all(req.params.id);
  res.json(rows);
});

contentRouter.put('/content/:id/variants/:platformId', (req, res) => {
  const { body, hashtags } = req.body;
  if (!body) return res.status(400).json({ error: 'body_required' });

  db.prepare(`
    INSERT INTO content_variants (content_id, platform_id, body, hashtags)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(content_id, platform_id) DO UPDATE SET body = excluded.body, hashtags = excluded.hashtags, updated_at = datetime('now')
  `).run(req.params.id, req.params.platformId, body, hashtags ?? null);

  res.json(db.prepare(`
    SELECT v.*, p.slug AS platform_slug, p.display_name AS platform_name
    FROM content_variants v JOIN platforms p ON p.id = v.platform_id
    WHERE v.content_id = ? AND v.platform_id = ?
  `).get(req.params.id, req.params.platformId));
});

contentRouter.delete('/content/:id/variants/:platformId', (req, res) => {
  db.prepare(`DELETE FROM content_variants WHERE content_id = ? AND platform_id = ?`).run(req.params.id, req.params.platformId);
  res.status(204).end();
});
