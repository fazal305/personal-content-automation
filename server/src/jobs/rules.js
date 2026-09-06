// A deliberately small WHEN/THEN rule engine — not a general workflow product.
// Each rule has a trigger_type (WHEN) and an action_type (THEN). Rules are data
// (automation_rules table), not code, so adding one doesn't require a deploy.
import { db, logEvent } from '../db/index.js';

// Triggers this build can actually evaluate. 'github_release' is intentionally
// absent — it needs the GitHub adapter (Phase 5) and would be a fake button otherwise.
const POLLABLE_TRIGGERS = ['stale_in_review'];

function runAction(rule, context) {
  switch (rule.action_type) {
    case 'notify': {
      logEvent({
        event_type: 'AUTOMATION_REMINDER',
        severity: 'warning',
        entity_type: context.entity_type ?? null,
        entity_id: context.entity_id ?? null,
        message: context.message,
        payload: { rule: rule.name },
      });
      return true;
    }
    case 'queue_analytics_sync': {
      const { content, platform } = context;
      logEvent({
        event_type: 'ANALYTICS_SYNC_QUEUED',
        entity_type: 'content',
        entity_id: content.id,
        message: platform.supports_analytics ? `queued for ${platform.display_name}` : `skipped — ${platform.display_name} has no analytics API`,
        payload: { rule: rule.name },
      });
      return true;
    }
    case 'create_idea': {
      // Reserved for the 'github_release' trigger once the GitHub adapter exists (Phase 5/10).
      return false;
    }
    default:
      return false;
  }
}

// Fires all enabled rules matching an event-driven trigger (called from other
// modules right after the triggering event happens, e.g. a successful publish).
export function runRulesForTrigger(triggerType, context) {
  const rules = db.prepare(`SELECT * FROM automation_rules WHERE trigger_type = ? AND enabled = 1`).all(triggerType);
  for (const rule of rules) runAction(rule, context);
}

// Polled once per scheduler tick — checks for content sitting in a stage too long.
function evaluateStaleInReview(rule) {
  const condition = rule.condition_json ? JSON.parse(rule.condition_json) : {};
  const days = condition.days ?? 3;

  const stale = db.prepare(`
    SELECT * FROM content
    WHERE status = 'in_review' AND datetime(updated_at) <= datetime('now', '-' || ? || ' days')
  `).all(days);

  for (const content of stale) {
    // Don't re-notify for the same item more than once a day — a poll-based
    // trigger without this would spam a reminder every tick indefinitely.
    const alreadyNotifiedToday = db.prepare(`
      SELECT 1 FROM automation_events
      WHERE event_type = 'AUTOMATION_REMINDER' AND entity_type = 'content' AND entity_id = ?
        AND date(created_at) = date('now')
      LIMIT 1
    `).get(content.id);
    if (alreadyNotifiedToday) continue;

    runAction(rule, {
      entity_type: 'content',
      entity_id: content.id,
      message: `"${content.title}" has been in review for ${days}+ days`,
    });
  }
}

export function evaluatePollableRules() {
  const rules = db.prepare(`SELECT * FROM automation_rules WHERE enabled = 1 AND trigger_type IN (${POLLABLE_TRIGGERS.map(() => '?').join(',')})`).all(...POLLABLE_TRIGGERS);
  for (const rule of rules) {
    if (rule.trigger_type === 'stale_in_review') evaluateStaleInReview(rule);
  }
}

const DEFAULT_RULES = [
  {
    name: 'Remind me about stale reviews',
    trigger_type: 'stale_in_review',
    condition_json: JSON.stringify({ days: 3 }),
    action_type: 'notify',
    action_json: null,
    enabled: 1,
  },
  {
    name: 'Queue analytics sync after publish',
    trigger_type: 'content_published',
    condition_json: null,
    action_type: 'queue_analytics_sync',
    action_json: null,
    enabled: 1,
  },
  {
    name: 'GitHub release -> content idea (requires GitHub adapter, Phase 5)',
    trigger_type: 'github_release',
    condition_json: null,
    action_type: 'create_idea',
    action_json: null,
    enabled: 0,
  },
];

export function seedDefaultRules() {
  const existing = db.prepare(`SELECT COUNT(*) AS n FROM automation_rules`).get().n;
  if (existing > 0) return;
  const insert = db.prepare(`
    INSERT INTO automation_rules (name, trigger_type, condition_json, action_type, action_json, enabled)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const r of DEFAULT_RULES) insert.run(r.name, r.trigger_type, r.condition_json, r.action_type, r.action_json, r.enabled);
}
