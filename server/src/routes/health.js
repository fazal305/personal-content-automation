import { Router } from 'express';
import { db } from '../db/index.js';
import { getSchedulerStatus } from '../jobs/scheduler.js';

export const healthRouter = Router();

healthRouter.get('/health', (req, res) => {
  const platforms = db.prepare('SELECT COUNT(*) AS n FROM platforms').get().n;
  res.json({
    status: 'ok',
    demoMode: process.env.DEMO_MODE === 'true',
    dryRun: process.env.DRY_RUN !== 'false',
    platformsRegistered: platforms,
    scheduler: getSchedulerStatus(),
    time: new Date().toISOString(),
  });
});
