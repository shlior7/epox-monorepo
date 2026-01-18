/**
 * Alert Service
 *
 * Send alerts via webhooks when queue events occur.
 */

/**
 * Alert channels
 */
export type AlertChannel = 'slack' | 'discord' | 'webhook' | 'email';

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
      case 'slack':
        return {
          text: `${this.getSeverityEmoji(payload.severity)} *${payload.type}*: ${payload.message}`,
          attachments: payload.details
            ? [
                {
                  color: this.getSeverityColor(payload.severity),
                  fields: Object.entries(payload.details).map(([key, value]) => ({
                    title: key,
                    value: String(value),
                    short: true,
                  })),
                },
              ]
            : undefined,
        };

      case 'discord':
        return {
          content: `${this.getSeverityEmoji(payload.severity)} **${payload.type}**: ${payload.message}`,
          embeds: payload.details
            ? [
                {
                  color: parseInt(this.getSeverityColor(payload.severity).slice(1), 16),
                  fields: Object.entries(payload.details).map(([key, value]) => ({
                    name: key,
                    value: String(value),
                    inline: true,
                  })),
                },
              ]
            : undefined,
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

  private getSeverityEmoji(severity: AlertPayload['severity']): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  }

  private getSeverityColor(severity: AlertPayload['severity']): string {
    switch (severity) {
      case 'critical':
        return '#FF0000';
      case 'error':
        return '#E53E3E';
      case 'warning':
        return '#DD6B20';
      case 'info':
      default:
        return '#3182CE';
    }
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
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
    const genericWebhook = process.env.ALERT_WEBHOOK_URL;

    const channels: AlertChannelConfig[] = [];

    if (slackWebhook) {
      channels.push({ type: 'slack', url: slackWebhook, enabled: true });
    }
    if (discordWebhook) {
      channels.push({ type: 'discord', url: discordWebhook, enabled: true });
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

