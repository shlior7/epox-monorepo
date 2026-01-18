/**
 * Structured Logging
 *
 * JSON-formatted logging for Cloud Run and other environments.
 */

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log context
 */
export interface LogContext {
  service?: string;
  jobId?: string;
  jobType?: string;
  sessionId?: string;
  clientId?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Structured log entry
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private service: string;
  private defaultContext: LogContext;

  constructor(service: string, defaultContext?: LogContext) {
    this.service = service;
    this.defaultContext = defaultContext ?? {};
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      context: { ...this.defaultContext, ...context },
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    // In Cloud Run, structured JSON logs are automatically parsed
    const output = JSON.stringify(entry);

    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.service, { ...this.defaultContext, ...context });
  }
}

/**
 * Create a new logger
 */
export function createLogger(service: string, context?: LogContext): Logger {
  return new Logger(service, context);
}

/**
 * Quick structured log function
 */
export function structuredLog(
  level: LogLevel,
  message: string,
  context?: LogContext
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case 'debug':
      console.debug(output);
      break;
    case 'info':
      console.info(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'error':
      console.error(output);
      break;
  }
}

