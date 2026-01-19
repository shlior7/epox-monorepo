/**
 * Structured Logger using Pino + Better Stack (Logtail)
 *
 * - In production: sends structured logs to Better Stack
 * - In development: pretty-prints to console
 * - Only logs 'info' level and above in production to save quota
 */

import pino, { Logger } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const betterStackToken = process.env.BETTERSTACK_TOKEN;

// Build transports based on environment
function buildTransport() {
  // In development, just use pretty console output
  if (isDev) {
    return {
      target: 'pino-pretty',
      options: { colorize: true },
    };
  }

  // In production with Better Stack token, use Logtail transport
  if (betterStackToken) {
    return {
      targets: [
        {
          target: '@logtail/pino',
          options: { sourceToken: betterStackToken },
          level: 'info', // Skip debug logs to save quota
        },
        // Also log to stdout for Railway's built-in logging
        {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
          level: 'info',
        },
      ],
    };
  }

  // Production without Better Stack - just stdout (for Railway)
  return {
    target: 'pino/file',
    options: { destination: 1 },
  };
}

// Create the logger instance
export const logger: Logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: buildTransport(),
  base: {
    service: 'epox-platform',
    env: process.env.NODE_ENV || 'development',
  },
});

// ============================================================================
// CONVENIENCE METHODS FOR COMMON LOGGING PATTERNS
// ============================================================================

/**
 * Log job/generation started event
 */
export function logJobStarted(jobId: string, data: Record<string, unknown>) {
  logger.info({ jobId, event: 'job_started', ...data }, 'Job started');
}

/**
 * Log job/generation completed successfully
 */
export function logJobSuccess(jobId: string, data: Record<string, unknown>) {
  logger.info({ jobId, event: 'job_success', ...data }, 'Job completed successfully');
}

/**
 * Log job/generation failed
 */
export function logJobFailed(
  jobId: string,
  error: Error | string,
  data: Record<string, unknown> = {}
) {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(
    { jobId, event: 'job_failed', error: errorMessage, stack: errorStack, ...data },
    'Job failed'
  );
}

/**
 * Log API request (call at start of request handling)
 */
export function logApiRequest(
  route: string,
  method: string,
  data: Record<string, unknown> = {}
) {
  logger.info({ route, method, event: 'api_request', ...data }, `${method} ${route}`);
}

/**
 * Log API response
 */
export function logApiResponse(
  route: string,
  method: string,
  statusCode: number,
  durationMs: number,
  data: Record<string, unknown> = {}
) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger[level](
    { route, method, statusCode, durationMs, event: 'api_response', ...data },
    `${method} ${route} ${statusCode} ${durationMs}ms`
  );
}

/**
 * Log with Sentry event ID for correlation
 */
export function logWithSentryId(
  level: 'info' | 'warn' | 'error',
  sentryEventId: string,
  message: string,
  data: Record<string, unknown> = {}
) {
  logger[level]({ sentryEventId, ...data }, message);
}
