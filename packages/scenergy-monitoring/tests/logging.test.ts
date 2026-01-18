/**
 * Unit Tests: Structured Logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, createLogger, structuredLog } from '../src/logging';

describe('Logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger class', () => {
    it('should create logger with service name', () => {
      const logger = new Logger('test-service');
      logger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged.service).toBe('test-service');
    });

    it('should log debug messages', () => {
      const logger = new Logger('test-service');
      logger.debug('Debug message', { key: 'value' });

      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(consoleDebugSpy.mock.calls[0][0] as string);
      expect(logged.level).toBe('debug');
      expect(logged.message).toBe('Debug message');
      expect(logged.context.key).toBe('value');
    });

    it('should log info messages', () => {
      const logger = new Logger('test-service');
      logger.info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged.level).toBe('info');
    });

    it('should log warning messages', () => {
      const logger = new Logger('test-service');
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string);
      expect(logged.level).toBe('warn');
    });

    it('should log error messages with error object', () => {
      const logger = new Logger('test-service');
      const error = new Error('Test error');
      logger.error('Error occurred', error, { jobId: 'job-123' });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
      expect(logged.level).toBe('error');
      expect(logged.error.message).toBe('Test error');
      expect(logged.error.name).toBe('Error');
      expect(logged.error.stack).toBeDefined();
      expect(logged.context.jobId).toBe('job-123');
    });

    it('should include timestamp in ISO format', () => {
      const logger = new Logger('test-service');
      logger.info('Test');

      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include default context', () => {
      const logger = new Logger('test-service', { environment: 'test' });
      logger.info('Test');

      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged.context.environment).toBe('test');
    });

    it('should merge context with default context', () => {
      const logger = new Logger('test-service', { default: 'value' });
      logger.info('Test', { additional: 'context' });

      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged.context.default).toBe('value');
      expect(logged.context.additional).toBe('context');
    });

    it('should create child logger with additional context', () => {
      const parentLogger = new Logger('test-service', { parent: 'context' });
      const childLogger = parentLogger.child({ child: 'context', jobId: 'job-456' });

      childLogger.info('Child message');

      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged.context.parent).toBe('context');
      expect(logged.context.child).toBe('context');
      expect(logged.context.jobId).toBe('job-456');
    });
  });

  describe('createLogger', () => {
    it('should create a Logger instance', () => {
      const logger = createLogger('my-service');
      expect(logger).toBeInstanceOf(Logger);

      logger.info('Test');
      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged.service).toBe('my-service');
    });

    it('should accept initial context', () => {
      const logger = createLogger('my-service', { version: '1.0.0' });
      logger.info('Test');

      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged.context.version).toBe('1.0.0');
    });
  });

  describe('structuredLog', () => {
    it('should log at specified level', () => {
      structuredLog('info', 'Quick log');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged.level).toBe('info');
      expect(logged.message).toBe('Quick log');
    });

    it('should include context in log', () => {
      structuredLog('warn', 'Warning', { detail: 'important' });

      const logged = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string);
      expect(logged.detail).toBe('important');
    });
  });

  describe('Log Output Format (Cloud Run Compatible)', () => {
    it('should output valid JSON', () => {
      const logger = new Logger('test-service');
      logger.info('Test message', { key: 'value' });

      const output = consoleInfoSpy.mock.calls[0][0] as string;
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should have required fields for Cloud Logging', () => {
      const logger = new Logger('test-service');
      logger.info('Test');

      const logged = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
      expect(logged).toHaveProperty('timestamp');
      expect(logged).toHaveProperty('level');
      expect(logged).toHaveProperty('message');
      expect(logged).toHaveProperty('service');
    });
  });
});

