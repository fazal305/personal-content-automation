// Documents the actual automation experiments built in this project, with real
// status and real learnings — not hypothetical placeholders. Run once; leaves
// existing rows untouched so your own edits/additions survive restarts.
import { db } from './index.js';

const EXPERIMENTS = [
  {
    name: 'Experiment 09 — GitHub release -> content idea',
    goal: 'Turn real GitHub activity into a reviewable content idea automatically, without posting about every commit.',
    trigger_desc: 'Scheduler tick polls GitHub public events every 5 minutes for the configured username.',
    input_desc: "GITHUB_USERNAME's public ReleaseEvents (action=published only).",
    processing_desc: 'Filter to published releases, check processed_external_events for a duplicate, insert a content row (status=idea) if new.',
    output_desc: 'A new Idea in the Content Library, source_type=github_activity, linked back to the release URL.',
    api_used: 'GitHub REST — public events API, no auth required',
    automation_used: 'jobs/githubWatch.js, gated by the github_release automation_rule',
    status: 'working',
    learnings: "Verified live against a real account (sindresorhus) — it correctly created an idea from an actual release and produced zero duplicates on a repeated poll. The idempotency ledger (processed_external_events) is what actually makes this safe to poll repeatedly, not the poll interval.",
  },
  {
    name: 'Experiment 06 — Scheduled post -> automated publishing',
    goal: 'Publish approved content at its scheduled time without double-publishing or losing a job on crash.',
    trigger_desc: 'scheduled_jobs.scheduled_for reached during a scheduler tick.',
    input_desc: 'An approved content item and its target platform.',
    processing_desc: 'Atomic job claim (UPDATE ... WHERE status=pending), adapter.publish() or dry-run simulation, record publishing_results, retry with backoff on failure up to max_retries.',
    output_desc: 'Content marked published (or failed after retries exhausted), a publishing_results row, and PUBLISH_* events.',
    api_used: 'Mastodon API, AT Protocol (Bluesky) — dry-run by default, real calls only when DRY_RUN=false and an adapter exists',
    automation_used: 'jobs/scheduler.js',
    status: 'working',
    learnings: "Found a real bug during testing, not by inspection: comparing the ISO timestamp string against SQLite's datetime('now') as raw text never matched ('T' sorts after ' ' in ASCII), so nothing was ever \"due\". Wrapping both sides in datetime() fixed it. Running the automation end-to-end caught this; reading the code did not.",
  },
  {
    name: 'Experiment 04 — Published post -> analytics collection',
    goal: 'Pull real engagement metrics after a real publish, without fabricating numbers for platforms or posts with nothing to show.',
    trigger_desc: 'content_published rule fires after a successful publish; a periodic sync also re-checks on each tick.',
    input_desc: 'publishing_results.external_post_id for successful, non-simulated posts on platforms with an analytics API.',
    processing_desc: 'adapter.getAnalytics(externalPostId), throttled to once per hour per content+platform, written as analytics_snapshots.',
    output_desc: 'Real metrics on the Analytics dashboard, or an explicit "not available" — never a placeholder number.',
    api_used: 'Mastodon API, AT Protocol (Bluesky)',
    automation_used: 'jobs/analyticsSync.js',
    status: 'working',
    learnings: "Dry-run posts get external_post_id = 'dry-run-N'. That prefix is the actual signal the sync job uses to skip them — without it the job would try to fetch analytics for a post that was never really published.",
  },
  {
    name: 'Experiment 05 — Analytics -> content recommendation',
    goal: 'Surface which content pillars/types actually perform better, without pretending a small sample is a trend.',
    trigger_desc: 'On-demand, when the Analytics page loads.',
    input_desc: 'Latest analytics_snapshots joined to each content item\'s pillar and content_type.',
    processing_desc: 'Group by pillar/type, average engagement per group, drop any group under 2 posts, refuse to generate any insight under 3 total analyzed posts.',
    output_desc: 'A plain-language, descriptive comparison ("X has averaged N vs M"), or an honest "not enough data yet" message.',
    api_used: 'none — internal aggregation only',
    automation_used: 'routes/intelligence.js',
    status: 'working',
    learnings: 'Tested with synthetic snapshot rows inserted directly into the DB. First attempt put one post in each of two pillars — the sample-size floor correctly refused to compare them ("not enough spread") instead of drawing a conclusion from n=1 per group. The guardrail mattered more than the averaging math.',
  },
  {
    name: 'Experiment 03 — Long-form content -> platform-specific variants',
    goal: 'Repurpose one idea into platform-appropriate versions without auto-publishing an AI rewrite anywhere.',
    trigger_desc: 'Manual "Generate" click on a platform in the Content Editor.',
    input_desc: "The content's title, hook, and body.",
    processing_desc: "AI repurpose call with a per-platform character limit, shown as an editable draft the user must explicitly save as a content_variant.",
    output_desc: 'A saved content_variants row for that platform, or nothing if the user discards the draft.',
    api_used: 'Anthropic Claude API (optional — requires ANTHROPIC_API_KEY)',
    automation_used: 'routes/ai.js repurpose endpoint + content_variants table (existed in the schema since Phase 1, unused until this)',
    status: 'working',
    learnings: "Not tested against a live Anthropic key in this environment — the request/response handling follows the documented API shape, but hasn't been exercised with a real key yet. Deliberately not automatic either way: a bad AI rewrite lands in an editable draft, never a scheduled post.",
  },
  {
    name: 'Experiment 02 — URL -> content draft',
    goal: 'Paste a link, capture its metadata (title/description/image), and turn it into a content idea.',
    trigger_desc: 'Manual URL paste.',
    input_desc: 'A URL.',
    processing_desc: 'Not yet built — would need to fetch and parse Open Graph tags, respecting robots.txt and not scraping aggressively.',
    output_desc: '—',
    api_used: 'none planned — self-fetch + parse, no third-party API needed',
    automation_used: '—',
    status: 'planned',
    learnings: '',
  },
  {
    name: 'Experiment 07 — Content pillar -> weekly content plan',
    goal: 'Suggest a balanced week of content across pillars based on actual pillar distribution history.',
    trigger_desc: 'Manual, likely weekly.',
    input_desc: 'Content pillar targets + recent publishing history.',
    processing_desc: 'Not yet built.',
    output_desc: '—',
    api_used: 'none planned',
    automation_used: '—',
    status: 'planned',
    learnings: '',
  },
  {
    name: 'Experiment 08 — RSS/feed -> idea inbox',
    goal: 'Pull items from a followed RSS feed into the Ideas inbox for review.',
    trigger_desc: 'Periodic feed poll.',
    input_desc: 'An RSS/Atom feed URL.',
    processing_desc: 'Not yet built.',
    output_desc: '—',
    api_used: 'none planned — plain feed parsing',
    automation_used: '—',
    status: 'planned',
    learnings: '',
  },
  {
    name: 'Experiment 10 — Daily summary -> personal notification',
    goal: "A daily digest of what's due, what failed, and what needs review — surfaced somewhere I'll actually see it.",
    trigger_desc: 'Daily, scheduled.',
    input_desc: 'Pipeline counts, failed jobs, stale reviews.',
    processing_desc: 'Not yet built — the data already exists (Command Center), just not pushed anywhere.',
    output_desc: '—',
    api_used: 'undecided',
    automation_used: '—',
    status: 'planned',
    learnings: '',
  },
];

export function seedDefaultExperiments() {
  const existing = db.prepare(`SELECT COUNT(*) AS n FROM experiments`).get().n;
  if (existing > 0) return;
  const insert = db.prepare(`
    INSERT INTO experiments (name, goal, trigger_desc, input_desc, processing_desc, output_desc, api_used, automation_used, status, learnings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const e of EXPERIMENTS) {
    insert.run(e.name, e.goal, e.trigger_desc, e.input_desc, e.processing_desc, e.output_desc, e.api_used, e.automation_used, e.status, e.learnings);
  }
}
