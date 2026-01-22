/**
 * Worker Autoscaler Service
 *
 * Monitors PostgreSQL queue depth and scales Railway worker instances accordingly.
 * Uses Redis for distributed rate limiting coordination.
 *
 * Scaling Logic:
 * - 0 jobs → 0 workers (save money)
 * - 1-10 jobs → 1 worker
 * - 11-30 jobs → 2 workers
 * - 31-60 jobs → 3 workers
 * - 61-100 jobs → 4 workers
 * - 100+ jobs → 5 workers (max, respects rate limit)
 */

import { createServer } from 'http';
import { Autoscaler } from './autoscaler';

// Configuration from environment
const config = {
  // Railway API
  railwayToken: process.env.RAILWAY_API_TOKEN!,
  railwayProjectId: process.env.RAILWAY_PROJECT_ID!,
  railwayEnvironmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
  railwayWorkerServiceId: process.env.RAILWAY_WORKER_SERVICE_ID!,

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Redis
  redisUrl: process.env.REDIS_URL!,

  // Scaling parameters
  maxWorkers: parseInt(process.env.MAX_WORKERS ?? '5', 10),
  minWorkers: parseInt(process.env.MIN_WORKERS ?? '0', 10),
  globalRpmLimit: parseInt(process.env.GLOBAL_RPM_LIMIT ?? '60', 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? '10000', 10), // 10s
  scaleDownCooldownMs: parseInt(process.env.SCALE_DOWN_COOLDOWN_MS ?? '120000', 10), // 2min
  scaleUpCooldownMs: parseInt(process.env.SCALE_UP_COOLDOWN_MS ?? '30000', 10), // 30s
};

// Validate required config
const requiredEnvVars = [
  'RAILWAY_API_TOKEN',
  'RAILWAY_PROJECT_ID',
  'RAILWAY_ENVIRONMENT_ID',
  'RAILWAY_WORKER_SERVICE_ID',
  'DATABASE_URL',
  'REDIS_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create autoscaler
const autoscaler = new Autoscaler(config);

// Health check server
const PORT = parseInt(process.env.PORT ?? '8080', 10);
const server = createServer(async (req, res) => {
  if (req.url === '/health') {
    const status = await autoscaler.getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  } else if (req.url === '/metrics') {
    const metrics = await autoscaler.getMetrics();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics));
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
  console.log('SIGTERM received, shutting down...');
  await autoscaler.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await autoscaler.stop();
  process.exit(0);
});

// Start autoscaler
autoscaler.start().catch((err) => {
  console.error('❌ Autoscaler failed to start:', err);
  process.exit(1);
});
