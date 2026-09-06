import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH || './data/content.db';
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Platform registry — the source of truth for what's real automation vs manual-assist.
// See docs/api-research.md for the reasoning behind each capability flag.
const platforms = [
  { slug: 'github', display_name: 'GitHub', publishing: 0, analytics: 1, media: 0, scheduling: 0 },
  { slug: 'mastodon', display_name: 'Mastodon', publishing: 1, analytics: 1, media: 1, scheduling: 1 },
  { slug: 'bluesky', display_name: 'Bluesky', publishing: 1, analytics: 1, media: 1, scheduling: 1 },
  { slug: 'threads', display_name: 'Threads', publishing: 1, analytics: 1, media: 1, scheduling: 1 },
  { slug: 'linkedin', display_name: 'LinkedIn', publishing: 0, analytics: 0, media: 1, scheduling: 0 },
  { slug: 'instagram', display_name: 'Instagram', publishing: 0, analytics: 0, media: 1, scheduling: 0 },
];

const insertPlatform = db.prepare(`
  INSERT INTO platforms (slug, display_name, supports_publishing, supports_analytics, supports_media, supports_scheduling)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET
    display_name = excluded.display_name,
    supports_publishing = excluded.supports_publishing,
    supports_analytics = excluded.supports_analytics,
    supports_media = excluded.supports_media,
    supports_scheduling = excluded.supports_scheduling
`);

for (const row of platforms) {
  insertPlatform.run(row.slug, row.display_name, row.publishing, row.analytics, row.media, row.scheduling);
}

// Single-row config, created empty if missing.
db.prepare(`INSERT OR IGNORE INTO config (id) VALUES (1)`).run();

export function logEvent({ event_type, severity = 'info', entity_type = null, entity_id = null, message = null, payload = null }) {
  db.prepare(`
    INSERT INTO automation_events (event_type, severity, entity_type, entity_id, message, payload_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(event_type, severity, entity_type, entity_id, message, payload ? JSON.stringify(payload) : null);
}
