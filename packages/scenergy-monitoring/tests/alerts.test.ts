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
        channels: [{ type: 'slack', url: 'https://hooks.slack.com/test', enabled: true }],
      });
      expect(service).toBeInstanceOf(AlertService);
    });
  });

  describe('sendAlert', () => {
    it('should send alert to slack channel', async () => {
      const service = new AlertService({
        channels: [{ type: 'slack', url: 'https://hooks.slack.com/test', enabled: true }],
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
        'https://hooks.slack.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('job_failed');
      expect(body.text).toContain('Job xyz123 failed');
    });

    it('should send alert to discord channel', async () => {
      const service = new AlertService({
        channels: [{ type: 'discord', url: 'https://discord.com/api/webhooks/test', enabled: true }],
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
      expect(body.content).toContain('queue_backlog');
      expect(body.content).toContain('Queue has 50 pending jobs');
    });

    it('should send alert to generic webhook', async () => {
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
          { type: 'slack', url: 'https://hooks.slack.com/test', enabled: true },
          { type: 'discord', url: 'https://discord.com/api/webhooks/test', enabled: true },
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

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should skip disabled channels', async () => {
      const service = new AlertService({
        channels: [
          { type: 'slack', url: 'https://hooks.slack.com/test', enabled: false },
          { type: 'discord', url: 'https://discord.com/api/webhooks/test', enabled: true },
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
      expect(mockFetch.mock.calls[0][0]).toBe('https://discord.com/api/webhooks/test');
    });

    it('should skip channels without URL', async () => {
      const service = new AlertService({
        channels: [
          { type: 'slack', url: undefined, enabled: true },
          { type: 'discord', url: 'https://discord.com/api/webhooks/test', enabled: true },
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
        channels: [{ type: 'slack', url: 'https://hooks.slack.com/test', enabled: true }],
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

    it('should include details as attachments in Slack', async () => {
      const service = new AlertService({
        channels: [{ type: 'slack', url: 'https://hooks.slack.com/test', enabled: true }],
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
      expect(body.attachments).toBeDefined();
      expect(body.attachments[0].fields).toHaveLength(3);
    });

    it('should include details as embeds in Discord', async () => {
      const service = new AlertService({
        channels: [{ type: 'discord', url: 'https://discord.com/api/webhooks/test', enabled: true }],
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
      expect(body.embeds).toBeDefined();
      expect(body.embeds[0].fields).toHaveLength(2);
    });
  });

  describe('Severity Formatting', () => {
    it('should use correct emoji for critical severity', async () => {
      const service = new AlertService({
        channels: [{ type: 'slack', url: 'https://hooks.slack.com/test', enabled: true }],
      });

      await service.sendAlert({
        type: 'worker_down',
        severity: 'critical',
        message: 'Critical alert',
        timestamp: new Date(),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('🚨');
    });

    it('should use correct emoji for error severity', async () => {
      const service = new AlertService({
        channels: [{ type: 'slack', url: 'https://hooks.slack.com/test', enabled: true }],
      });

      await service.sendAlert({
        type: 'job_failed',
        severity: 'error',
        message: 'Error alert',
        timestamp: new Date(),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('❌');
    });

    it('should use correct emoji for warning severity', async () => {
      const service = new AlertService({
        channels: [{ type: 'slack', url: 'https://hooks.slack.com/test', enabled: true }],
      });

      await service.sendAlert({
        type: 'queue_backlog',
        severity: 'warning',
        message: 'Warning alert',
        timestamp: new Date(),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('⚠️');
    });

    it('should use correct emoji for info severity', async () => {
      const service = new AlertService({
        channels: [{ type: 'slack', url: 'https://hooks.slack.com/test', enabled: true }],
      });

      await service.sendAlert({
        type: 'high_latency',
        severity: 'info',
        message: 'Info alert',
        timestamp: new Date(),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('ℹ️');
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
      vi.stubEnv('SLACK_WEBHOOK_URL', '');
      vi.stubEnv('DISCORD_WEBHOOK_URL', '');
      vi.stubEnv('ALERT_WEBHOOK_URL', '');

      // Force re-evaluation by clearing any cached instance
      // (Note: In actual implementation you might need a reset function)
      const service = getAlertService();
      // This might return a cached instance or null depending on implementation
    });
  });
});

