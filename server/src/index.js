import 'dotenv/config';
import { createApp } from './app.js';

const port = process.env.PORT || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port} (dryRun=${process.env.DRY_RUN !== 'false'}, demoMode=${process.env.DEMO_MODE === 'true'})`);
});
