-- Personal Content Automation — database schema
-- SQLite. Kept deliberately flat and readable over normalized-to-the-hilt.

-- Single-row table holding brand/voice configuration (Module: Personal Brand Mode).
-- Nothing about the user is hardcoded elsewhere in the app — it all reads from here.
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- enforce single row
  brand_name TEXT,
  bio TEXT,
  website TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  tone TEXT,                    -- e.g. "direct, technical, builder-focused"
  default_hashtags TEXT,        -- comma-separated
  cta_preference TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Content pillars: the strategic categories all ideas/content should map to.
CREATE TABLE IF NOT EXISTS content_pillars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,                   -- CSS token or hex, used for pillar chips
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Adapter registry: one row per platform this system knows how to talk to.
-- Capability flags let the UI honestly say what's real automation vs manual-assist.
CREATE TABLE IF NOT EXISTS platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,           -- 'github' | 'mastodon' | 'bluesky' | 'threads' | 'linkedin' | 'instagram'
  display_name TEXT NOT NULL,
  supports_publishing INTEGER NOT NULL DEFAULT 0, -- 1 = real automated publish, 0 = manual-assist/export only
  supports_analytics INTEGER NOT NULL DEFAULT 0,
  supports_media INTEGER NOT NULL DEFAULT 0,
  supports_scheduling INTEGER NOT NULL DEFAULT 0,
  connection_status TEXT NOT NULL DEFAULT 'disconnected', -- 'disconnected' | 'connected' | 'expired' | 'error'
  token_expires_at TEXT,               -- nullable; drives the Automation Health "reconnect" warning
  last_checked_at TEXT
);

-- The core unit of content, carried through its whole lifecycle via `status`.
-- Lifecycle: idea -> draft -> in_review -> approved -> scheduled -> publishing -> published -> failed -> archived
CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  hook TEXT,
  body TEXT,
  cta TEXT,
  hashtags TEXT,
  content_type TEXT,             -- 'text' | 'text+image' | 'video' | 'thread' | 'article'
  target_platform TEXT,          -- intended platform slug at idea stage, before variants exist
  status TEXT NOT NULL DEFAULT 'idea',
  pillar_id INTEGER REFERENCES content_pillars(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'normal', -- 'low' | 'normal' | 'high'
  source_type TEXT,               -- 'manual' | 'github_activity' | 'url_capture' | 'ai_generated'
  source_url TEXT,
  notes TEXT,
  ai_generated INTEGER NOT NULL DEFAULT 0, -- true if any AI assistance touched this content — stays visible in the UI
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_tags (
  content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

-- Platform-specific versions of one master content item (a LinkedIn version vs a short X version, etc).
CREATE TABLE IF NOT EXISTS content_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES platforms(id),
  body TEXT NOT NULL,
  hashtags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (content_id, platform_id)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  type TEXT,                     -- 'image' | 'video' | 'thumbnail'
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  related_content_id INTEGER REFERENCES content(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A scheduled attempt to publish one content_variant to one platform at a given time.
-- idempotency_key is unique so a re-run tick can never double-publish the same job.
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL UNIQUE,
  content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES platforms(id),
  scheduled_for TEXT NOT NULL,   -- ISO datetime
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled'
  dry_run INTEGER NOT NULL DEFAULT 1,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per completed publish attempt (success or failure), keyed to the job.
CREATE TABLE IF NOT EXISTS publishing_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL UNIQUE REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  success INTEGER NOT NULL,
  external_post_id TEXT,         -- id returned by the platform, if any
  external_url TEXT,
  error_message TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Raw analytics data points pulled from platform APIs. No fabricated metrics —
-- absence of a row means "not available through connected API", shown as such in the UI.
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES platforms(id),
  metric_name TEXT NOT NULL,     -- 'views' | 'likes' | 'comments' | 'shares' | 'clicks' | ...
  metric_value INTEGER NOT NULL,
  collected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Simple WHEN/THEN automation rules (not a general rule engine — deliberately small).
CREATE TABLE IF NOT EXISTS automation_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,    -- e.g. 'github_release' | 'content_published' | 'stale_in_review'
  condition_json TEXT,           -- small JSON blob of trigger parameters
  action_type TEXT NOT NULL,     -- e.g. 'create_idea' | 'queue_analytics_sync' | 'notify'
  action_json TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Append-only event log — powers the Automation Event Log UI and is the audit trail
-- for every automated thing this system ever did.
CREATE TABLE IF NOT EXISTS automation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,      -- 'CONTENT_CREATED' | 'AI_DRAFT_GENERATED' | 'PUBLISH_STARTED' | ...
  severity TEXT NOT NULL DEFAULT 'info', -- 'info' | 'success' | 'warning' | 'error'
  entity_type TEXT,              -- 'content' | 'job' | 'platform' | 'rule'
  entity_id INTEGER,
  message TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Experiment Lab entries — each one documents a small automation experiment end-to-end.
CREATE TABLE IF NOT EXISTS experiments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  goal TEXT,
  trigger_desc TEXT,
  input_desc TEXT,
  processing_desc TEXT,
  output_desc TEXT,
  api_used TEXT,
  automation_used TEXT,
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned' | 'in_progress' | 'working' | 'abandoned'
  learnings TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_pillar ON content(pillar_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_for ON scheduled_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON automation_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_content ON analytics_snapshots(content_id);
