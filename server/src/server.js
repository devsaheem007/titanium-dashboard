import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

async function start() {
  await connectDB();
  const app = createApp();
  app.listen(env.port, () => console.log(`Titanium API running on http://localhost:${env.port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
