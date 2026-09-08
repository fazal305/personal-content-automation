# Automations

Every automation in this system, as Trigger → Condition → Action → Result.
This is the same set documented (with real test results and learnings) as
Experiment Lab entries — see the Experiment Lab page in the app, or
`server/src/db/seedExperiments.js` for the seed data.

---

### Scheduled publishing

- **Trigger**: scheduler tick (every 60s)
- **Condition**: a `scheduled_jobs` row has `status = 'pending'` and
  `scheduled_for <= now`
- **Action**: atomically claim the job, call the platform adapter's
  `publish()` (or simulate, if dry-run or no adapter exists), record the
  result
- **Result**: content → `published` on success; on failure, retried up to 3
  times with backoff, then content → `failed`

### GitHub release → content idea

- **Trigger**: scheduler tick, throttled to once per 5 minutes
- **Condition**: `GITHUB_USERNAME` is set in `.env`, the `github_release`
  automation rule is enabled, and a release event hasn't been processed
  before (checked against `processed_external_events`)
- **Action**: create a `content` row with `status = 'idea'`,
  `source_type = 'github_activity'`
- **Result**: a new idea appears in the Ideas/Library UI, ready for human
  review — never auto-drafted further, never auto-published

### Queue analytics sync after publish

- **Trigger**: a scheduled job's publish attempt succeeds
- **Condition**: the `content_published` automation rule is enabled
- **Action**: log an `ANALYTICS_SYNC_QUEUED` event (informational — the
  actual sync is the next automation)
- **Result**: visible in the Event Log; the real sync happens on the next
  scheduler tick

### Analytics collection

- **Trigger**: scheduler tick
- **Condition**: a `publishing_results` row exists with `success = 1`, a
  non-simulated `external_post_id`, on a platform with `supports_analytics
  = 1`, and no snapshot collected in the last hour for that (content,
  platform) pair
- **Action**: call the adapter's `getAnalytics(externalPostId)`, write an
  `analytics_snapshots` row per metric returned
- **Result**: real numbers on the Analytics dashboard, or an explicit "not
  available" if nothing's been collected yet — never a placeholder

### Stale-in-review reminder

- **Trigger**: scheduler tick
- **Condition**: content has `status = 'in_review'` and hasn't been updated
  in 3+ days (configurable per-rule), and hasn't already been reminded about
  today
- **Action**: log an `AUTOMATION_REMINDER` event
- **Result**: visible in the Event Log; nothing changes automatically —
  it's a nudge, not an escalation

### Content intelligence insight

- **Trigger**: on-demand, when the Analytics page loads
- **Condition**: at least 3 posts have real analytics, and at least 2 posts
  exist in a comparison group (pillar or content type) — otherwise the
  system says so explicitly instead of drawing a conclusion from too little
  data
- **Action**: compute average engagement per pillar/content-type group
- **Result**: a plain-language, descriptive comparison, phrased as "has
  averaged X vs Y" rather than a prediction

### AI draft generation / rewrite / repurpose / quality check

- **Trigger**: manual button click in the Content Editor
- **Condition**: `ANTHROPIC_API_KEY` is set
- **Action**: call the Anthropic API with the brand-voice-aware system
  prompt, return text
- **Result**: shown as a preview the user must explicitly apply (draft) or
  that directly fills a field the user must still click Save on (rewrite) —
  AI never writes to the database on its own
