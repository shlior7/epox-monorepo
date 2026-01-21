/**
 * User Settings Schema
 * Stores user preferences for generation defaults and notifications
 */

import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import type { FlowGenerationSettings } from 'visualizer-types';

// ===== NOTIFICATION SETTINGS =====

export interface NotificationSettings {
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

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
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

// ===== DEFAULT GENERATION SETTINGS =====

export interface DefaultGenerationSettings {
  aspectRatio: '1:1' | '16:9' | '9:16';
  varietyLevel: number;
  matchProductColors: boolean;
  preferredStyle?: string;
}

export const DEFAULT_GENERATION_DEFAULTS: DefaultGenerationSettings = {
  aspectRatio: '1:1',
  varietyLevel: 50,
  matchProductColors: true,
};

// ===== USER SETTINGS TABLE =====

export const userSettings = pgTable(
  'user_settings',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    defaultGenerationSettings: jsonb('default_generation_settings').$type<DefaultGenerationSettings>(),
    notificationSettings: jsonb('notification_settings').$type<NotificationSettings>(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('user_settings_user_id_idx').on(table.userId)]
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, {
    fields: [userSettings.userId],
    references: [user.id],
  }),
}));
