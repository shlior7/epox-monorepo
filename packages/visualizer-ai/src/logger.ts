/**
 * Structured Logging for AI Services
 *
 * Features:
 * - Request ID tracking across operations
 * - Structured JSON logs for Better Stack
 * - Sentry integration for errors
 * - Cost tracking per operation
 * - Performance metrics
 */

import { randomUUID } from 'crypto';

export interface LogContext {
  requestId?: string;
  clientId?: string;
  userId?: string;
  operation?: string;
  model?: string;
  cost?: number;
  duration?: number;
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Sentry integration (optional)
let sentryInstance: typeof import('@sentry/node') | null = null;

/**
 * Initialize Sentry for error tracking
 */
export function initSentry(sentry: typeof import('@sentry/node')): void {
  sentryInstance = sentry;
  console.log('✅ Sentry logging initialized');
}

/**
 * Format log entry for Better Stack / structured logging
 */
function formatLogEntry(level: LogLevel, message: string, context: LogContext, error?: Error): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: {
      ...context,
      environment: process.env.NODE_ENV ?? 'development',
      service: 'visualizer-ai',
    },
  };

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

/**
 * Output log entry (JSON in production, pretty in development)
 */
function outputLog(entry: LogEntry): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Pretty console output for development
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[entry.level];

    const contextStr = Object.keys(entry.context).length > 0 ? ` ${JSON.stringify(entry.context)}` : '';
    console[entry.level === 'debug' ? 'log' : entry.level](`${emoji} [${entry.context.operation ?? 'AI'}] ${entry.message}${contextStr}`);

    if (entry.error) {
      console.error(entry.error.stack ?? entry.error.message);
    }
  } else {
    // Structured JSON for production (Better Stack)
    console.log(JSON.stringify(entry));
  }
}

/**
 * Logger class with request context
 */
export class Logger {
  constructor(private readonly context: LogContext = {}) {
    // Auto-generate request ID if not provided
    if (!this.context.requestId) {
      this.context.requestId = randomUUID();
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log debug message
   */
  debug(message: string, additionalContext?: LogContext): void {
    const entry = formatLogEntry('debug', message, { ...this.context, ...additionalContext });
    outputLog(entry);
  }

  /**
   * Log info message
   */
  info(message: string, additionalContext?: LogContext): void {
    const entry = formatLogEntry('info', message, { ...this.context, ...additionalContext });
    outputLog(entry);
  }

  /**
   * Log warning
   */
  warn(message: string, additionalContext?: LogContext): void {
    const entry = formatLogEntry('warn', message, { ...this.context, ...additionalContext });
    outputLog(entry);
  }

  /**
   * Log error with Sentry integration
   */
  error(message: string, error?: Error, additionalContext?: LogContext): void {
    const entry = formatLogEntry('error', message, { ...this.context, ...additionalContext }, error);
    outputLog(entry);

    // Send to Sentry if available
    if (sentryInstance && error) {
      sentryInstance.captureException(error, {
        contexts: {
          ai_operation: this.context,
        },
        tags: {
          operation: this.context.operation,
          model: this.context.model,
        },
      });
    }
  }

  /**
   * Log AI operation with cost and duration
   */
  aiOperation(operation: string, details: { model: string; cost?: number; duration?: number; success: boolean }): void {
    const level = details.success ? 'info' : 'error';
    const entry = formatLogEntry(level, `AI operation: ${operation}`, {
      ...this.context,
      operation,
      model: details.model,
      cost: details.cost,
      duration: details.duration,
      success: details.success,
    });
    outputLog(entry);
  }

  /**
   * Get the current request ID
   */
  getRequestId(): string {
    return this.context.requestId ?? '';
  }

  /**
   * Get the full context
   */
  getContext(): LogContext {
    return { ...this.context };
  }
}

/**
 * Create a new logger with context
 */
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}

/**
 * Default logger instance (use createLogger for request-specific logging)
 */
export const defaultLogger = createLogger();
