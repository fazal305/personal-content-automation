import 'dotenv/config';
import { createApp } from './app.js';
import { startScheduler } from './jobs/scheduler.js';
import { seedDefaultRules } from './jobs/rules.js';

const port = process.env.PORT || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port} (dryRun=${process.env.DRY_RUN !== 'false'}, demoMode=${process.env.DEMO_MODE === 'true'})`);
});

seedDefaultRules();

// Ticks every 60s, checking for scheduled_jobs whose scheduled_for time has arrived
// and evaluating pollable automation rules (e.g. stale-in-review reminders).
startScheduler(60_000);
console.log('[scheduler] started (60s interval)');
