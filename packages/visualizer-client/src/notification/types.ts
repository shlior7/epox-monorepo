/**
 * Notification Service Types
 */

export type NotificationType =
  | 'generation_completed'
  | 'generation_failed'
  | 'quota_warning'
  | 'quota_limit_reached'
  | 'invitation_received'
  | 'system';

export type NotificationChannel = 'browser' | 'email' | 'in_app';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface BrowserNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export interface NotificationPreferences {
  email: {
    generationCompleted: boolean;
    generationFailed: boolean;
    weeklyUsageSummary: boolean;
    tipsAndBestPractices: boolean;
  };
  browser: {
    generationCompleted: boolean;
    lowQuotaWarning: boolean;
  };
  frequency: 'realtime' | 'daily' | 'never';
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: {
    generationCompleted: true,
    generationFailed: true,
    weeklyUsageSummary: false,
    tipsAndBestPractices: false,
  },
  browser: {
    generationCompleted: true,
    lowQuotaWarning: false,
  },
  frequency: 'realtime',
};
