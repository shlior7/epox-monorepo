import { eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import {
  userSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_GENERATION_DEFAULTS,
  type NotificationSettings,
  type DefaultGenerationSettings,
} from '../schema/user-settings';
import { BaseRepository } from './base';

export interface UserSettings {
  id: string;
  userId: string;
  defaultGenerationSettings: DefaultGenerationSettings | null;
  notificationSettings: NotificationSettings | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettingsUpdate {
  defaultGenerationSettings?: DefaultGenerationSettings;
  notificationSettings?: NotificationSettings;
}

export class UserSettingsRepository extends BaseRepository<UserSettings> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, userSettings);
  }

  async getByUserId(userId: string): Promise<UserSettings | null> {
    const rows = await this.drizzle.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async getOrCreate(userId: string): Promise<UserSettings> {
    const existing = await this.getByUserId(userId);
    if (existing) {
      return existing;
    }

    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(userSettings)
      .values({
        id,
        userId,
        defaultGenerationSettings: DEFAULT_GENERATION_DEFAULTS,
        notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async update(userId: string, data: UserSettingsUpdate): Promise<UserSettings> {
    const existing = await this.getOrCreate(userId);

    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.defaultGenerationSettings !== undefined) {
      updatePayload.defaultGenerationSettings = data.defaultGenerationSettings;
    }

    if (data.notificationSettings !== undefined) {
      updatePayload.notificationSettings = data.notificationSettings;
    }

    const [updated] = await this.drizzle.update(userSettings).set(updatePayload).where(eq(userSettings.id, existing.id)).returning();

    return this.mapToEntity(updated);
  }

  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<UserSettings> {
    const existing = await this.getOrCreate(userId);
    const currentSettings = existing.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS;

    const merged: NotificationSettings = {
      email: { ...currentSettings.email, ...settings.email },
      browser: { ...currentSettings.browser, ...settings.browser },
      frequency: settings.frequency ?? currentSettings.frequency,
    };

    return this.update(userId, { notificationSettings: merged });
  }

  async updateDefaultGenerationSettings(userId: string, settings: Partial<DefaultGenerationSettings>): Promise<UserSettings> {
    const existing = await this.getOrCreate(userId);
    const currentSettings = existing.defaultGenerationSettings ?? DEFAULT_GENERATION_DEFAULTS;

    const merged: DefaultGenerationSettings = {
      ...currentSettings,
      ...settings,
    };

    return this.update(userId, { defaultGenerationSettings: merged });
  }
}
