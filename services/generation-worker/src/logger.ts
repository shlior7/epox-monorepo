/**
 * Structured Logger for Generation Worker
 *
 * Uses Pino + Better Stack (Logtail) for structured logging.
 * Integrates with Sentry for error tracking.
 */

import pino, { Logger } from 'pino';
import * as Sentry from '@sentry/node';
import type { JobResult } from 'visualizer-db/schema';

const isDev = process.env.NODE_ENV !== 'production';
const betterStackToken = process.env.BETTERSTACK_TOKEN;

// Initialize Sentry
if (!isDev && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || 'development',
    ignoreErrors: ['ECONNRESET', 'ETIMEDOUT'],
    initialScope: {
      tags: { service: 'generation-worker' },
    },
  });
}

// Build transports based on environment
function buildTransport() {
  if (isDev) {
    return {
      target: 'pino-pretty',
      options: { colorize: true },
    };
  }

  if (betterStackToken) {
    return {
      targets: [
        {
          target: '@logtail/pino',
          options: { sourceToken: betterStackToken },
          level: 'info',
        },
        {
          target: 'pino/file',
          options: { destination: 1 },
          level: 'info',
        },
      ],
    };
  }

  return {
    target: 'pino/file',
    options: { destination: 1 },
  };
}

export const logger: Logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: buildTransport(),
  base: {
    service: 'generation-worker',
    workerId: process.env.WORKER_ID ?? `worker_${process.pid}`,
    env: process.env.NODE_ENV || 'development',
  },
});

// ============================================================================
// JOB LOGGING HELPERS
// ============================================================================

export function logJobClaimed(jobId: string, jobType: string, attempt: number, maxAttempts: number) {
  logger.info({ jobId, jobType, attempt, maxAttempts, event: 'job_claimed' }, 'Job claimed');
}

export function logJobProgress(jobId: string, progress: number, details?: Record<string, unknown>) {
  logger.debug({ jobId, progress, event: 'job_progress', ...details }, `Job progress: ${progress}%`);
}

export function logJobSuccess(jobId: string, durationMs: number, result: JobResult) {
  logger.info({ jobId, durationMs, event: 'job_success', ...result }, `Job completed in ${durationMs}ms`);
}

export function logJobFailed(jobId: string, error: Error | string, attempt: number, maxAttempts: number, willRetry: boolean) {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(
    { jobId, error: errorMessage, stack: errorStack, attempt, maxAttempts, willRetry, event: 'job_failed' },
    willRetry ? `Job failed, will retry (${attempt}/${maxAttempts})` : `Job failed permanently`
  );

  // Send to Sentry
  if (!isDev) {
    const sentryError = error instanceof Error ? error : new Error(errorMessage);
    Sentry.captureException(sentryError, {
      tags: { jobId, attempt: String(attempt), willRetry: String(willRetry) },
    });
  }
}

export function logWorkerStarted(workerId: string, config: Record<string, unknown>) {
  logger.info({ workerId, event: 'worker_started', ...config }, 'Worker started');
}

export function logWorkerStopped(workerId: string) {
  logger.info({ workerId, event: 'worker_stopped' }, 'Worker stopped');
}
