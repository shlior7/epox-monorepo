/**
 * Structured Logger using Pino + Better Stack (Logtail)
 *
 * - In production: sends structured logs to Better Stack (if configured)
 * - In development: pretty-prints to console
 * - Only logs 'info' level and above in production to save quota
 * - IMPORTANT: Logger failures should NEVER crash the app
 */

import pino, { Logger } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const betterStackToken = process.env.BETTERSTACK_TOKEN;

// Build transports based on environment - always returns a safe fallback
function buildTransport() {
  // In development, use pretty console output (or fallback to stdout)
  if (isDev) {
    try {
      return {
        target: 'pino-pretty',
        options: { colorize: true },
      };
    } catch {
      // pino-pretty not available, use stdout
      return undefined;
    }
  }

  // Production - only use stdout to avoid transport initialization issues
  // Better Stack can be integrated via log drain on the hosting platform
  return undefined;
}

// Create the logger instance safely
function createLogger(): Logger {
  try {
    const transport = buildTransport();
    return pino({
      level: isDev ? 'debug' : 'info',
      ...(transport ? { transport } : {}),
      base: {
        service: 'epox-platform',
        env: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error) {
    // If pino fails, create a minimal console-based logger
    console.error('Failed to initialize pino logger:', error);
    return {
      level: 'info',
      info: (obj: unknown, msg?: string) => console.log(msg || '', obj),
      warn: (obj: unknown, msg?: string) => console.warn(msg || '', obj),
      error: (obj: unknown, msg?: string) => console.error(msg || '', obj),
      debug: (obj: unknown, msg?: string) => console.debug(msg || '', obj),
      fatal: (obj: unknown, msg?: string) => console.error(msg || '', obj),
      trace: (obj: unknown, msg?: string) => console.trace(msg || '', obj),
      child: () => createLogger(),
    } as unknown as Logger;
  }
}

export const logger: Logger = createLogger();

// ============================================================================
// CONVENIENCE METHODS FOR COMMON LOGGING PATTERNS
// ============================================================================

/**
 * Log job/generation started event
 */
export function logJobStarted(jobId: string, data: Record<string, unknown>) {
  logger.info({ ...data, jobId, event: 'job_started' }, 'Job started');
}

/**
 * Log job/generation completed successfully
 */
export function logJobSuccess(jobId: string, data: Record<string, unknown>) {
  logger.info({ ...data, jobId, event: 'job_success' }, 'Job completed successfully');
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
    { ...data, jobId, event: 'job_failed', error: errorMessage, stack: errorStack },
    'Job failed'
  );
}

/**
 * Log API request (call at start of request handling)
 */
export function logApiRequest(route: string, method: string, data: Record<string, unknown> = {}) {
  logger.info({ ...data, route, method, event: 'api_request' }, `${method} ${route}`);
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
    { ...data, route, method, statusCode, durationMs, event: 'api_response' },
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
  logger[level]({ ...data, sentryEventId }, message);
}
