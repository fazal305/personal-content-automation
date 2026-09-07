import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { contentRouter } from './routes/content.js';
import { miscRouter } from './routes/misc.js';
import { jobsRouter } from './routes/jobs.js';
import { aiRouter } from './routes/ai.js';
import { analyticsRouter } from './routes/analytics.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api', healthRouter);
  app.use('/api', contentRouter);
  app.use('/api', miscRouter);
  app.use('/api', jobsRouter);
  app.use('/api', aiRouter);
  app.use('/api', analyticsRouter);

  app.use((req, res) => res.status(404).json({ error: 'not_found' }));

  return app;
}
