import { Router } from 'express';
import { db, logEvent } from '../db/index.js';
import * as ai from '../adapters/anthropic.js';

export const aiRouter = Router();

function requireAi(req, res, next) {
  if (!ai.isAiConfigured()) {
    return res.status(503).json({ error: 'ai_not_configured', message: 'Set ANTHROPIC_API_KEY in .env to enable AI assistance.' });
  }
  next();
}

function getConfig() {
  return db.prepare('SELECT * FROM config WHERE id = 1').get();
}

aiRouter.get('/ai/status', (req, res) => {
  res.json({ configured: ai.isAiConfigured() });
});

aiRouter.post('/ai/generate-draft', requireAi, async (req, res) => {
  const content = db.prepare('SELECT * FROM content WHERE id = ?').get(req.body.content_id);
  if (!content) return res.status(404).json({ error: 'content_not_found' });

  try {
    const draft = await ai.generateDraft({ content, config: getConfig() });
    logEvent({ event_type: 'AI_DRAFT_GENERATED', entity_type: 'content', entity_id: content.id, message: content.title });
    res.json(draft);
  } catch (err) {
    res.status(502).json({ error: 'ai_request_failed', message: err.message });
  }
});

aiRouter.post('/ai/rewrite', requireAi, async (req, res) => {
  const content = db.prepare('SELECT * FROM content WHERE id = ?').get(req.body.content_id);
  if (!content) return res.status(404).json({ error: 'content_not_found' });

  try {
    const text = await ai.rewrite({ content, mode: req.body.mode, config: getConfig() });
    logEvent({ event_type: 'AI_REWRITE_GENERATED', entity_type: 'content', entity_id: content.id, message: req.body.mode });
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: 'ai_request_failed', message: err.message });
  }
});

aiRouter.post('/ai/repurpose', requireAi, async (req, res) => {
  const content = db.prepare('SELECT * FROM content WHERE id = ?').get(req.body.content_id);
  const platform = db.prepare('SELECT * FROM platforms WHERE id = ?').get(req.body.platform_id);
  if (!content || !platform) return res.status(404).json({ error: 'not_found' });

  try {
    const text = await ai.repurpose({ content, platform, config: getConfig() });
    logEvent({ event_type: 'AI_REPURPOSE_GENERATED', entity_type: 'content', entity_id: content.id, message: platform.display_name });
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: 'ai_request_failed', message: err.message });
  }
});

aiRouter.post('/ai/quality-check', requireAi, async (req, res) => {
  const content = db.prepare('SELECT * FROM content WHERE id = ?').get(req.body.content_id);
  if (!content) return res.status(404).json({ error: 'content_not_found' });

  try {
    const result = await ai.qualityCheck({ content });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'ai_request_failed', message: err.message });
  }
});
