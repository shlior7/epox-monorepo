/**
 * Alert Service
 *
 * Send alerts via webhooks when queue events occur.
 */

/**
 * Alert channels
 */
export type AlertChannel = 'webhook' | 'email';

/**
 * Alert configuration
 */
export interface AlertConfig {
  channels: AlertChannelConfig[];
  thresholds?: {
    failedJobsPerMinute?: number;
    queueBacklogSize?: number;
    jobDurationMs?: number;
  };
}

interface AlertChannelConfig {
  type: AlertChannel;
  url?: string;
  enabled: boolean;
}

/**
 * Alert payload
 */
export interface AlertPayload {
  type: 'job_failed' | 'queue_backlog' | 'high_latency' | 'worker_down';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Alert service for sending notifications
 */
export class AlertService {
  private config: AlertConfig;

  constructor(config: AlertConfig) {
    this.config = config;
  }

  /**
   * Send an alert to configured channels
   */
  async sendAlert(payload: AlertPayload): Promise<void> {
    const promises = this.config.channels
      .filter((ch) => ch.enabled && ch.url)
      .map((ch) => this.sendToChannel(ch, payload));

    await Promise.allSettled(promises);
  }

  /**
   * Send alert to a specific channel
   */
  private async sendToChannel(
    channel: AlertChannelConfig,
    payload: AlertPayload
  ): Promise<void> {
    if (!channel.url) return;

    try {
      const body = this.formatPayload(channel.type, payload);

      await fetch(channel.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error(`Failed to send alert to ${channel.type}:`, error);
    }
  }

  /**
   * Format payload for different channel types
   */
  private formatPayload(
    type: AlertChannel,
    payload: AlertPayload
  ): Record<string, unknown> {
    switch (type) {
      case 'email':
        return {
          subject: `[${payload.severity.toUpperCase()}] ${payload.type}: ${payload.message}`,
          body: this.formatEmailBody(payload),
          severity: payload.severity,
        };

      case 'webhook':
      default:
        return {
          type: payload.type,
          severity: payload.severity,
          message: payload.message,
          details: payload.details,
          timestamp: payload.timestamp.toISOString(),
        };
    }
  }

  /**
   * Format email body with details
   */
  private formatEmailBody(payload: AlertPayload): string {
    let body = `Alert Type: ${payload.type}\n`;
    body += `Severity: ${payload.severity}\n`;
    body += `Message: ${payload.message}\n`;
    body += `Timestamp: ${payload.timestamp.toISOString()}\n`;

    if (payload.details) {
      body += '\nDetails:\n';
      for (const [key, value] of Object.entries(payload.details)) {
        const formattedValue = typeof value === 'object' && value !== null
          ? JSON.stringify(value, null, 2)
          : String(value);
        body += `  ${key}: ${formattedValue}\n`;
      }
    }

    return body;
  }

}

// Singleton
let _alertService: AlertService | null = null;

/**
 * Create a new alert service
 */
export function createAlertService(config: AlertConfig): AlertService {
  return new AlertService(config);
}

/**
 * Get the singleton alert service
 */
export function getAlertService(): AlertService | null {
  if (!_alertService) {
    const emailWebhook = process.env.EMAIL_WEBHOOK_URL;
    const genericWebhook = process.env.ALERT_WEBHOOK_URL;

    const channels: AlertChannelConfig[] = [];

    if (emailWebhook) {
      channels.push({ type: 'email', url: emailWebhook, enabled: true });
    }
    if (genericWebhook) {
      channels.push({ type: 'webhook', url: genericWebhook, enabled: true });
    }

    if (channels.length === 0) {
      return null;
    }

    _alertService = new AlertService({ channels });
  }

  return _alertService;
}

