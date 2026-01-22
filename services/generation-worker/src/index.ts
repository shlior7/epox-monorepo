/**
 * Generation Worker Entry Point
 *
 * Processes image generation jobs from PostgreSQL queue.
 */

import { createServer } from 'http';
import { GenerationWorker } from './worker';

let worker: GenerationWorker | null = null;
let workerError: string | null = null;
let workerStarted = false;

// Start health server FIRST to ensure Railway healthcheck passes
const PORT = parseInt(process.env.PORT ?? '8080', 10);
const server = createServer((req, res) => {
  if (req.url === '/health') {
    if (workerStarted && !workerError) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', worker: 'running' }));
    } else if (workerError) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'unhealthy', error: workerError }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'starting' }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`🏥 Health check server running on port ${PORT}`);
  initializeWorker();
});

async function initializeWorker(): Promise<void> {
  try {
    console.log('Initializing worker...');
    worker = new GenerationWorker();

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received');
      if (worker) await worker.stop();
      server.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received');
      if (worker) await worker.stop();
      server.close();
      process.exit(0);
    });

    await worker.start();
    workerStarted = true;
    console.log('Worker started successfully');
  } catch (err) {
    workerError = err instanceof Error ? err.message : 'Unknown error';
    console.error('Worker failed to start:', err);
  }
}
