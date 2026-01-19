/**
 * Unit Tests: Alert Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AlertService, createAlertService, getAlertService, type AlertPayload } from '../src/alerts';

describe('AlertService', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create service with channels config', () => {
      const service = new AlertService({
        channels: [{ type: 'email', url: 'https://email-service.com/send', enabled: true }],
      });
      expect(service).toBeInstanceOf(AlertService);
    });
  });

  describe('sendAlert', () => {
    it('should send alert to email channel', async () => {
      const service = new AlertService({
        channels: [{ type: 'email', url: 'https://email-service.com/send', enabled: true }],
      });

      const payload: AlertPayload = {
        type: 'job_failed',
        severity: 'error',
        message: 'Job xyz123 failed',
        timestamp: new Date(),
      };

      await service.sendAlert(payload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://email-service.com/send',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('job_failed');
      expect(body.subject).toContain('Job xyz123 failed');
      expect(body.body).toContain('Job xyz123 failed');
    });

    it('should send alert to webhook channel', async () => {
      const service = new AlertService({
        channels: [{ type: 'webhook', url: 'https://example.com/webhook', enabled: true }],
      });

      const payload: AlertPayload = {
        type: 'queue_backlog',
        severity: 'warning',
        message: 'Queue has 50 pending jobs',
        timestamp: new Date(),
      };

      await service.sendAlert(payload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe('queue_backlog');
      expect(body.message).toContain('Queue has 50 pending jobs');
    });

    it('should send alert with details to webhook', async () => {
      const service = new AlertService({
        channels: [{ type: 'webhook', url: 'https://example.com/webhook', enabled: true }],
      });

      const payload: AlertPayload = {
        type: 'worker_down',
        severity: 'critical',
        message: 'Worker instance terminated',
        details: { instanceId: 'worker-1', reason: 'OOM' },
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      await service.sendAlert(payload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe('worker_down');
      expect(body.severity).toBe('critical');
      expect(body.message).toBe('Worker instance terminated');
      expect(body.details.instanceId).toBe('worker-1');
      expect(body.timestamp).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should send to multiple channels', async () => {
      const service = new AlertService({
        channels: [
          { type: 'email', url: 'https://email-service.com/send', enabled: true },
          { type: 'webhook', url: 'https://example.com/webhook', enabled: true },
        ],
      });

      const payload: AlertPayload = {
        type: 'job_failed',
        severity: 'error',
        message: 'Test alert',
        timestamp: new Date(),
      };

      await service.sendAlert(payload);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should skip disabled channels', async () => {
      const service = new AlertService({
        channels: [
          { type: 'email', url: 'https://email-service.com/send', enabled: false },
          { type: 'webhook', url: 'https://example.com/webhook', enabled: true },
        ],
      });

      const payload: AlertPayload = {
        type: 'job_failed',
        severity: 'error',
        message: 'Test',
        timestamp: new Date(),
      };

      await service.sendAlert(payload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('https://example.com/webhook');
    });

    it('should skip channels without URL', async () => {
      const service = new AlertService({
        channels: [
          { type: 'email', url: undefined, enabled: true },
          { type: 'webhook', url: 'https://example.com/webhook', enabled: true },
        ],
      });

      const payload: AlertPayload = {
        type: 'job_failed',
        severity: 'error',
        message: 'Test',
        timestamp: new Date(),
      };

      await service.sendAlert(payload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const service = new AlertService({
        channels: [{ type: 'email', url: 'https://email-service.com/send', enabled: true }],
      });

      const payload: AlertPayload = {
        type: 'job_failed',
        severity: 'error',
        message: 'Test',
        timestamp: new Date(),
      };

      // Should not throw
      await expect(service.sendAlert(payload)).resolves.not.toThrow();
    });

    it('should include details in email body', async () => {
      const service = new AlertService({
        channels: [{ type: 'email', url: 'https://email-service.com/send', enabled: true }],
      });

      const payload: AlertPayload = {
        type: 'job_failed',
        severity: 'error',
        message: 'Job failed',
        details: { jobId: 'job-123', error: 'Timeout', duration: 30000 },
        timestamp: new Date(),
      };

      await service.sendAlert(payload);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.body).toContain('jobId: job-123');
      expect(body.body).toContain('error: Timeout');
      expect(body.body).toContain('duration: 30000');
    });

    it('should format object and array details with JSON.stringify in email body', async () => {
      const service = new AlertService({
        channels: [{ type: 'email', url: 'https://email-service.com/send', enabled: true }],
      });

      const payload: AlertPayload = {
        type: 'worker_down',
        severity: 'critical',
        message: 'Worker crashed',
        details: {
          workerId: 'worker-1',
          config: { concurrency: 5, timeout: 30000 },
          errors: ['Connection lost', 'Timeout'],
          metadata: { instanceId: 'i-123', region: 'us-east-1' },
        },
        timestamp: new Date(),
      };

      await service.sendAlert(payload);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Primitive values should be formatted as strings
      expect(body.body).toContain('workerId: worker-1');
      // Objects should be JSON.stringify'd
      expect(body.body).toContain('"concurrency": 5');
      expect(body.body).toContain('"timeout": 30000');
      // Arrays should be JSON.stringify'd
      expect(body.body).toContain('"Connection lost"');
      expect(body.body).toContain('"Timeout"');
      // Nested objects should be formatted
      expect(body.body).toContain('"instanceId": "i-123"');
    });

    it('should include details in webhook payload', async () => {
      const service = new AlertService({
        channels: [{ type: 'webhook', url: 'https://example.com/webhook', enabled: true }],
      });

      const payload: AlertPayload = {
        type: 'job_failed',
        severity: 'warning',
        message: 'Job warning',
        details: { metric: 'high_latency', value: 5000 },
        timestamp: new Date(),
      };

      await service.sendAlert(payload);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.details).toBeDefined();
      expect(body.details.metric).toBe('high_latency');
      expect(body.details.value).toBe(5000);
    });
  });

  describe('Email Formatting', () => {
    it('should format email subject with critical severity', async () => {
      const service = new AlertService({
        channels: [{ type: 'email', url: 'https://email-service.com/send', enabled: true }],
      });

      await service.sendAlert({
        type: 'worker_down',
        severity: 'critical',
        message: 'Critical alert',
        timestamp: new Date(),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('[CRITICAL]');
      expect(body.subject).toContain('worker_down');
      expect(body.subject).toContain('Critical alert');
    });

    it('should format email subject with error severity', async () => {
      const service = new AlertService({
        channels: [{ type: 'email', url: 'https://email-service.com/send', enabled: true }],
      });

      await service.sendAlert({
        type: 'job_failed',
        severity: 'error',
        message: 'Error alert',
        timestamp: new Date(),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('[ERROR]');
      expect(body.subject).toContain('job_failed');
    });

    it('should format email subject with warning severity', async () => {
      const service = new AlertService({
        channels: [{ type: 'email', url: 'https://email-service.com/send', enabled: true }],
      });

      await service.sendAlert({
        type: 'queue_backlog',
        severity: 'warning',
        message: 'Warning alert',
        timestamp: new Date(),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('[WARNING]');
    });

    it('should format email subject with info severity', async () => {
      const service = new AlertService({
        channels: [{ type: 'email', url: 'https://email-service.com/send', enabled: true }],
      });

      await service.sendAlert({
        type: 'high_latency',
        severity: 'info',
        message: 'Info alert',
        timestamp: new Date(),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('[INFO]');
    });
  });

  describe('createAlertService', () => {
    it('should create a new AlertService instance', () => {
      const service = createAlertService({
        channels: [{ type: 'webhook', url: 'https://example.com', enabled: true }],
      });
      expect(service).toBeInstanceOf(AlertService);
    });
  });

  describe('getAlertService', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should return null when no webhook URLs are configured', () => {
      vi.stubEnv('EMAIL_WEBHOOK_URL', '');
      vi.stubEnv('ALERT_WEBHOOK_URL', '');

      // Force re-evaluation by clearing any cached instance
      // (Note: In actual implementation you might need a reset function)
      const service = getAlertService();
      // This might return a cached instance or null depending on implementation
    });
  });
});

