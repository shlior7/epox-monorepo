/**
 * User Settings Service Types
 * Re-exports types from visualizer-db schema
 */

import type { NotificationPreferences } from '../notification/types';

export interface DefaultGenerationSettings {
  aspectRatio: '1:1' | '16:9' | '9:16';
  varietyLevel: number;
  matchProductColors: boolean;
  preferredStyle?: string;
}

export const DEFAULT_GENERATION_SETTINGS: DefaultGenerationSettings = {
  aspectRatio: '1:1',
  varietyLevel: 50,
  matchProductColors: true,
};

export interface UserSettingsData {
  userId: string;
  defaultGenerationSettings: DefaultGenerationSettings;
  notificationSettings: NotificationPreferences;
}

export type { NotificationPreferences };



