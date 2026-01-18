/**
 * AI Worker Service
 *
 * Processes AI jobs from the queue.
 * Job status updates are stored in Redis for polling.
 */

import express from 'express';
import { QueueWorker } from 'scenergy-queue';
import { createBullBoardApp, createLogger } from 'scenergy-monitoring';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const REDIS_URL = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_URL;
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10);
// Gemini rate limit: Use RPM (requests per minute) to match Gemini's billing model
// Free tier: 10 RPM, Pay-as-you-go: 60 RPM, Scale tier: 1000+ RPM
const MAX_JOBS_PER_MINUTE = parseInt(process.env.GEMINI_RPM ?? '60', 10);

const logger = createLogger('ai-worker');

let worker: QueueWorker | null = null;
let isShuttingDown = false;

async function main(): Promise<void> {
  if (!REDIS_URL) {
    logger.error('REDIS_URL or UPSTASH_REDIS_URL required');
    process.exit(1);
  }

  logger.info('Starting AI Worker', { concurrency: CONCURRENCY, maxJobsPerMinute: MAX_JOBS_PER_MINUTE });

  // Create worker
  worker = new QueueWorker({
    redisUrl: REDIS_URL,
    concurrency: CONCURRENCY,
    maxJobsPerMinute: MAX_JOBS_PER_MINUTE,
  });

  // Express server for health checks
  const app = express();

  app.get('/health', (_req, res) => {
    res.status(isShuttingDown ? 503 : 200).json({ status: isShuttingDown ? 'shutting_down' : 'healthy' });
  });

  // Optional: Bull Board dashboard
  if (process.env.ENABLE_BULL_BOARD === 'true') {
    const { serverAdapter } = createBullBoardApp({ redisUrl: REDIS_URL, basePath: '/admin/queues' });
    app.use('/admin/queues', serverAdapter.getRouter());
    logger.info('Bull Board enabled at /admin/queues');
  }

  const server = app.listen(PORT, () => logger.info(`Listening on port ${PORT}`));

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {process.exit(1);}
    isShuttingDown = true;
    logger.info(`${signal} received, shutting down`);

    server.close();
    if (worker) {await worker.close();}

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
