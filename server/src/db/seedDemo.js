// Seeds clearly-labeled demo data so the public repo is easy to try without
// connecting any real accounts. Safe to run repeatedly (idempotent per title).
import 'dotenv/config';
import { db, logEvent } from './index.js';
import { seedDefaultExperiments } from './seedExperiments.js';

const pillars = [
  { name: 'Build in Public', description: 'Progress updates on projects I\'m building.', color: '--color-accent' },
  { name: 'Automation', description: 'Automation systems, scheduling, pipelines.', color: '--color-success' },
  { name: 'Web Development', description: 'Frontend/backend engineering notes.', color: '--color-warning' },
  { name: 'Learning', description: 'Concepts learned while building.', color: '--color-text-muted' },
];

const insertPillar = db.prepare(`INSERT OR IGNORE INTO content_pillars (name, description, color) VALUES (?, ?, ?)`);
for (const p of pillars) insertPillar.run(p.name, p.description, p.color);

const pillarId = (name) => db.prepare('SELECT id FROM content_pillars WHERE name = ?').get(name)?.id;

const demoContent = [
  {
    title: '[DEMO] What I learned building my first automation system',
    hook: "I stopped building demos and started building systems I actually use.",
    body: 'Long-form draft body would go here...',
    status: 'idea',
    pillar: 'Build in Public',
    source_type: 'manual',
  },
  {
    title: '[DEMO] GitHub release → content idea pipeline',
    hook: 'Automating the boring part of build-in-public: remembering to post about it.',
    body: 'This project detects meaningful GitHub activity and turns it into a reviewable content idea.',
    status: 'draft',
    pillar: 'Automation',
    source_type: 'github_activity',
  },
  {
    title: '[DEMO] Idempotency: why my scheduler cannot double-publish',
    hook: 'A crashed worker should never mean the same post goes out twice.',
    body: 'Every scheduled job gets a unique idempotency key checked before publish.',
    status: 'in_review',
    pillar: 'Learning',
    source_type: 'manual',
  },
  {
    title: '[DEMO] Shipping the content calendar view',
    hook: 'The calendar is the visual center of the whole publishing workflow.',
    body: 'Approved content becomes a scheduled job you can see on a real calendar.',
    status: 'approved',
    pillar: 'Web Development',
    source_type: 'manual',
  },
  {
    title: '[DEMO] Why LinkedIn is manual-assist, not automated, here',
    hook: 'Real automation only where a free, individual-friendly API actually exists.',
    body: 'LinkedIn analytics require partner access I will never get for a personal project — so this system is honest about it.',
    status: 'published',
    pillar: 'Automation',
    source_type: 'manual',
  },
];

const insertContent = db.prepare(`
  INSERT INTO content (title, hook, body, status, pillar_id, source_type)
  SELECT ?, ?, ?, ?, ?, ?
  WHERE NOT EXISTS (SELECT 1 FROM content WHERE title = ?)
`);

for (const c of demoContent) {
  const info = insertContent.run(c.title, c.hook, c.body, c.status, pillarId(c.pillar), c.source_type, c.title);
  if (info.changes > 0) {
    logEvent({ event_type: 'CONTENT_CREATED', entity_type: 'content', entity_id: info.lastInsertRowid, message: `${c.title} (demo seed)` });
  }
}

seedDefaultExperiments();

console.log('[seedDemo] demo data ready.');
