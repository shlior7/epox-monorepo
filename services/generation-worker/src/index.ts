/**
 * Generation Worker Entry Point
 *
 * Processes image generation jobs from PostgreSQL queue.
 */

import { createServer } from 'http';
import { GenerationWorker } from './worker';

const worker = new GenerationWorker();

// Health check server for Railway
const PORT = parseInt(process.env.PORT ?? '8080', 10);
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', worker: 'running' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`🏥 Health check server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received');
  await worker.stop();
  process.exit(0);
});

// Start worker
worker.start().catch((err: unknown) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
