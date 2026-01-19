/**
 * Notification Service
 * Handles sending notifications via various channels
 */

import type {
  NotificationType,
  NotificationPayload,
  BrowserNotificationPayload,
  NotificationPreferences,
} from './types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './types';

export interface NotificationServiceConfig {
  appUrl: string;
  appName?: string;
}

export class NotificationService {
  private readonly config: NotificationServiceConfig;

  constructor(config: NotificationServiceConfig) {
    this.config = {
      ...config,
      appName: config.appName ?? 'Epox Visualizer',
    };
  }

  /**
   * Check if a notification type should be sent based on preferences
   */
  shouldSendNotification(
    type: NotificationType,
    channel: 'email' | 'browser',
    preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
  ): boolean {
    if (preferences.frequency === 'never') {
      return false;
    }

    switch (type) {
      case 'generation_completed':
        return channel === 'email'
          ? preferences.email.generationCompleted
          : preferences.browser.generationCompleted;
      case 'generation_failed':
        return channel === 'email'
          ? preferences.email.generationFailed
          : true; // Always show failures in browser
      case 'quota_warning':
      case 'quota_limit_reached':
        return channel === 'browser'
          ? preferences.browser.lowQuotaWarning
          : true; // Always email quota issues
      case "invitation_received": { throw new Error('Not implemented yet: "invitation_received" case') }
      case "system": { throw new Error('Not implemented yet: "system" case') }
      default:
        return true;
    }
  }

  /**
   * Build a browser notification payload
   */
  buildBrowserNotification(payload: NotificationPayload): BrowserNotificationPayload {
    return {
      title: payload.title,
      body: payload.message,
      icon: '/icon-192x192.png',
      tag: payload.type,
      data: {
        url: payload.actionUrl,
        ...payload.metadata,
      },
      actions: payload.actionUrl
        ? [{ action: 'open', title: payload.actionLabel ?? 'View' }]
        : undefined,
    };
  }

  /**
   * Create generation completed notification
   */
  generationCompleted(sessionName: string, imageCount: number, resultsUrl: string): NotificationPayload {
    return {
      type: 'generation_completed',
      title: 'Generation Complete! 🎉',
      message: `${imageCount} images for "${sessionName}" are ready to view.`,
      actionUrl: resultsUrl,
      actionLabel: 'View Images',
      metadata: { sessionName, imageCount },
    };
  }

  /**
   * Create generation failed notification
   */
  generationFailed(sessionName: string, failedCount: number, totalCount: number, resultsUrl: string): NotificationPayload {
    return {
      type: 'generation_failed',
      title: 'Generation Issue',
      message: `${failedCount} of ${totalCount} images for "${sessionName}" couldn't be generated.`,
      actionUrl: resultsUrl,
      actionLabel: 'View Details',
      metadata: { sessionName, failedCount, totalCount },
    };
  }

  /**
   * Create quota warning notification
   */
  quotaWarning(usagePercent: number, remaining: number): NotificationPayload {
    return {
      type: 'quota_warning',
      title: 'Approaching Monthly Limit',
      message: `You've used ${usagePercent}% of your monthly generations. ${remaining} remaining.`,
      actionUrl: `${this.config.appUrl}/settings/account`,
      actionLabel: 'View Usage',
      metadata: { usagePercent, remaining },
    };
  }

  /**
   * Create quota limit reached notification
   */
  quotaLimitReached(resetDate: string): NotificationPayload {
    return {
      type: 'quota_limit_reached',
      title: 'Monthly Limit Reached',
      message: `You've reached your monthly generation limit. Resets on ${resetDate}.`,
      actionUrl: `${this.config.appUrl}/settings/account`,
      actionLabel: 'Upgrade Plan',
      metadata: { resetDate },
    };
  }
}

// Singleton instance
let _notificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  _notificationService ??= new NotificationService({
      appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL) ?? 'http://localhost:3000',
    });
  return _notificationService;
}

export function resetNotificationService(): void {
  _notificationService = null;
}



