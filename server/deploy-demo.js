// Entry point used only for the public demo deployment: seeds clearly-labeled
// demo data (idempotent, safe to run on every deploy) before starting the
// server, so a fresh deploy never depends on anyone's real local database.
import './src/db/seedDemo.js';
import './src/index.js';
