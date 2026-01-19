/**
 * User Settings Service
 * Business logic for user settings management
 */

import type {
  DefaultGenerationSettings,
  UserSettingsData,
} from './types';
import { DEFAULT_GENERATION_SETTINGS } from './types';
import type { NotificationPreferences } from '../notification/types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../notification/types';

export interface UserSettingsServiceDependencies {
  getSettings: (userId: string) => Promise<UserSettingsData | null>;
  saveSettings: (userId: string, data: Partial<UserSettingsData>) => Promise<void>;
}

export class UserSettingsService {
  private readonly deps: UserSettingsServiceDependencies;

  constructor(deps: UserSettingsServiceDependencies) {
    this.deps = deps;
  }

  /**
   * Get user settings with defaults
   */
  async getSettings(userId: string): Promise<UserSettingsData> {
    const stored = await this.deps.getSettings(userId);

    if (!stored) {
      return {
        userId,
        defaultGenerationSettings: DEFAULT_GENERATION_SETTINGS,
        notificationSettings: DEFAULT_NOTIFICATION_PREFERENCES,
      };
    }

    return {
      userId,
      defaultGenerationSettings: stored.defaultGenerationSettings ?? DEFAULT_GENERATION_SETTINGS,
      notificationSettings: stored.notificationSettings ?? DEFAULT_NOTIFICATION_PREFERENCES,
    };
  }

  /**
   * Update default generation settings
   */
  async updateDefaultGenerationSettings(
    userId: string,
    settings: Partial<DefaultGenerationSettings>
  ): Promise<DefaultGenerationSettings> {
    const current = await this.getSettings(userId);

    const updated: DefaultGenerationSettings = {
      ...current.defaultGenerationSettings,
      ...settings,
    };

    await this.deps.saveSettings(userId, {
      defaultGenerationSettings: updated,
    });

    return updated;
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    settings: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getSettings(userId);
    const currentNotif = current.notificationSettings;

    const updated: NotificationPreferences = {
      email: { ...currentNotif.email, ...settings.email },
      browser: { ...currentNotif.browser, ...settings.browser },
      frequency: settings.frequency ?? currentNotif.frequency,
    };

    await this.deps.saveSettings(userId, {
      notificationSettings: updated,
    });

    return updated;
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults(userId: string): Promise<UserSettingsData> {
    const defaults: UserSettingsData = {
      userId,
      defaultGenerationSettings: DEFAULT_GENERATION_SETTINGS,
      notificationSettings: DEFAULT_NOTIFICATION_PREFERENCES,
    };

    await this.deps.saveSettings(userId, defaults);

    return defaults;
  }

  /**
   * Validate aspect ratio
   */
  isValidAspectRatio(ratio: string): ratio is '1:1' | '16:9' | '9:16' {
    return ['1:1', '16:9', '9:16'].includes(ratio);
  }

  /**
   * Validate variety level
   */
  isValidVarietyLevel(level: number): boolean {
    return level >= 0 && level <= 100;
  }
}

// Factory function for creating user settings service with dependencies
export function createUserSettingsService(deps: UserSettingsServiceDependencies): UserSettingsService {
  return new UserSettingsService(deps);
}



