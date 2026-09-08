# Internal API

Base URL: `http://localhost:4000/api` (or `PORT` from `.env`).

Only endpoints that actually exist are documented here — nothing aspirational.

## Content

| Method | Path | Description |
|---|---|---|
| GET | `/content` | List content. Query: `status`, `pillar_id`, `q` (search title/hook/body), `tag` |
| GET | `/content/pipeline-counts` | Count of content per lifecycle stage |
| GET | `/content/:id` | One content item, with tags |
| POST | `/content` | Create content (status defaults to `idea`) |
| PATCH | `/content/:id` | Update fields, including `status` (validated against the lifecycle) |
| DELETE | `/content/:id` | Delete |
| GET | `/content/:id/variants` | List platform-specific variants for one content item |
| PUT | `/content/:id/variants/:platformId` | Create or update a variant (upsert) |
| DELETE | `/content/:id/variants/:platformId` | Delete a variant |

## Calendar & Scheduling

| Method | Path | Description |
|---|---|---|
| GET | `/calendar` | List scheduled jobs, joined to content/platform. Query: `content_id` |
| POST | `/schedule` | Schedule approved content (`content_id`, `platform_id`, `scheduled_for`, optional `dry_run`) |
| DELETE | `/schedule/:jobId` | Cancel a pending job, reverts content to `approved` |

## Automation

| Method | Path | Description |
|---|---|---|
| POST | `/automation/run` | Manually trigger a scheduler tick (publish due jobs, poll rules, poll GitHub, sync analytics) |
| GET | `/automation/status` | Scheduler status: last tick, next job, pending/failed counts |
| GET | `/automation/rules` | List WHEN/THEN automation rules |
| PATCH | `/automation/rules/:id` | Toggle a rule's `enabled` flag |

## Platforms & Pillars

| Method | Path | Description |
|---|---|---|
| GET | `/platforms` | List platforms with capability flags and connection status |
| POST | `/platforms/:slug/test-connection` | Test a platform's credentials (from `.env`), updates `connection_status` |
| GET | `/pillars` | List content pillars |
| POST | `/pillars` | Create a pillar |
| GET | `/tags` | List all tags |

## Events

| Method | Path | Description |
|---|---|---|
| GET | `/events` | List automation events. Query: `limit`, `event_type`, `severity`, `entity_type` |
| GET | `/events/types` | Distinct event types seen so far (for filter dropdowns) |

## Config

| Method | Path | Description |
|---|---|---|
| GET | `/config` | Brand voice / personal config (single row) |
| PATCH | `/config` | Update brand config fields |

## AI Assistant (optional — requires `ANTHROPIC_API_KEY`)

| Method | Path | Description |
|---|---|---|
| GET | `/ai/status` | Whether the AI assistant is configured |
| POST | `/ai/generate-draft` | `content_id` → `{hook, body, cta, hashtags}` draft |
| POST | `/ai/rewrite` | `content_id`, `mode` → rewritten body text |
| POST | `/ai/repurpose` | `content_id`, `platform_id` → platform-specific post text |
| POST | `/ai/quality-check` | `content_id` → `{issues: [...]}` |

Every AI route returns `503 {"error":"ai_not_configured"}` if no API key is set — never a fake or fallback response.

## Analytics & Intelligence

| Method | Path | Description |
|---|---|---|
| GET | `/analytics/overview` | Published counts by platform/pillar, top content by engagement |
| GET | `/analytics/content/:id` | Latest metrics per platform for one content item |
| GET | `/intelligence/insights` | Pattern comparison across pillars/content types (real data only, see below) |

`intelligence/insights` returns `{ready: false, message: "..."}` below a minimum sample size (3 posts with real analytics, 2+ per comparison group) instead of guessing from too little data.

## Experiments

| Method | Path | Description |
|---|---|---|
| GET | `/experiments` | List experiment lab entries |
| POST | `/experiments` | Create one |
| PATCH | `/experiments/:id` | Update status/learnings/etc |

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Server status, demo/dry-run flags, scheduler status |
