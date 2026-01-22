/**
 * User Settings Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UserSettingsRepository } from '../../repositories/user-settings';
import { testDb } from '../setup';
import { createTestUser } from '../helpers';

describe('UserSettingsRepository', () => {
  let repo: UserSettingsRepository;
  let testUserId: string;

  beforeEach(async () => {
    repo = new UserSettingsRepository(testDb as any);

    const user = await createTestUser(testDb as any);
    testUserId = user.id;
  });

  describe('getByUserId', () => {
    it('should return settings for user', async () => {
      await repo.getOrCreate(testUserId);

      const settings = await repo.getByUserId(testUserId);

      expect(settings).toBeDefined();
      expect(settings?.userId).toBe(testUserId);
    });

    it('should return null for user with no settings', async () => {
      const newUser = await createTestUser(testDb as any, { email: 'nosettings@test.com' });
      const settings = await repo.getByUserId(newUser.id);

      expect(settings).toBeNull();
    });
  });

  describe('getOrCreate', () => {
    it('should return existing settings', async () => {
      const first = await repo.getOrCreate(testUserId);
      const second = await repo.getOrCreate(testUserId);

      expect(first.id).toBe(second.id);
    });

    it('should create with default settings', async () => {
      const settings = await repo.getOrCreate(testUserId);

      expect(settings.userId).toBe(testUserId);
      expect(settings.defaultGenerationSettings).toBeDefined();
      expect(settings.notificationSettings).toBeDefined();
    });

    it('should set default generation settings', async () => {
      const settings = await repo.getOrCreate(testUserId);

      expect(settings.defaultGenerationSettings?.aspectRatio).toBe('1:1');
      expect(settings.defaultGenerationSettings?.varietyLevel).toBe(50);
      expect(settings.defaultGenerationSettings?.matchProductColors).toBe(true);
    });

    it('should set default notification settings', async () => {
      const settings = await repo.getOrCreate(testUserId);

      expect(settings.notificationSettings?.email.generationCompleted).toBe(true);
      expect(settings.notificationSettings?.email.generationFailed).toBe(true);
      expect(settings.notificationSettings?.browser.generationCompleted).toBe(true);
      expect(settings.notificationSettings?.frequency).toBe('realtime');
    });

    it('should set timestamps', async () => {
      const settings = await repo.getOrCreate(testUserId);

      expect(settings.createdAt).toBeInstanceOf(Date);
      expect(settings.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update defaultGenerationSettings', async () => {
      await repo.getOrCreate(testUserId);

      const updated = await repo.update(testUserId, {
        defaultGenerationSettings: {
          aspectRatio: '16:9',
          varietyLevel: 80,
          matchProductColors: false,
        },
      });

      expect(updated.defaultGenerationSettings?.aspectRatio).toBe('16:9');
      expect(updated.defaultGenerationSettings?.varietyLevel).toBe(80);
      expect(updated.defaultGenerationSettings?.matchProductColors).toBe(false);
    });

    it('should update notificationSettings', async () => {
      await repo.getOrCreate(testUserId);

      const updated = await repo.update(testUserId, {
        notificationSettings: {
          email: {
            generationCompleted: false,
            generationFailed: true,
            weeklyUsageSummary: true,
            tipsAndBestPractices: false,
          },
          browser: {
            generationCompleted: false,
            lowQuotaWarning: true,
          },
          frequency: 'daily',
        },
      });

      expect(updated.notificationSettings?.email.generationCompleted).toBe(false);
      expect(updated.notificationSettings?.email.weeklyUsageSummary).toBe(true);
      expect(updated.notificationSettings?.browser.lowQuotaWarning).toBe(true);
      expect(updated.notificationSettings?.frequency).toBe('daily');
    });

    it('should update updatedAt timestamp', async () => {
      await repo.getOrCreate(testUserId);
      const before = await repo.getByUserId(testUserId);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repo.update(testUserId, {
        defaultGenerationSettings: {
          aspectRatio: '16:9',
          varietyLevel: 50,
          matchProductColors: true,
        },
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime());
    });

    it('should create settings if not exist', async () => {
      const newUser = await createTestUser(testDb as any, { email: 'newuser@test.com' });

      const updated = await repo.update(newUser.id, {
        defaultGenerationSettings: {
          aspectRatio: '1:1',
          varietyLevel: 100,
          matchProductColors: true,
        },
      });

      expect(updated.userId).toBe(newUser.id);
      expect(updated.defaultGenerationSettings?.varietyLevel).toBe(100);
    });
  });

  describe('updateNotificationSettings', () => {
    it('should merge notification settings', async () => {
      await repo.getOrCreate(testUserId);

      // Cast to any since the method accepts partial nested objects at runtime
      const updated = await repo.updateNotificationSettings(testUserId, {
        email: { weeklyUsageSummary: true },
      } as any);

      // Original values preserved
      expect(updated.notificationSettings?.email.generationCompleted).toBe(true);
      expect(updated.notificationSettings?.email.generationFailed).toBe(true);
      // New value updated
      expect(updated.notificationSettings?.email.weeklyUsageSummary).toBe(true);
    });

    it('should update frequency', async () => {
      await repo.getOrCreate(testUserId);

      const updated = await repo.updateNotificationSettings(testUserId, {
        frequency: 'daily',
      });

      expect(updated.notificationSettings?.frequency).toBe('daily');
    });

    it('should merge browser settings', async () => {
      await repo.getOrCreate(testUserId);

      // Cast to any since the method accepts partial nested objects at runtime
      const updated = await repo.updateNotificationSettings(testUserId, {
        browser: { lowQuotaWarning: true },
      } as any);

      expect(updated.notificationSettings?.browser.generationCompleted).toBe(true);
      expect(updated.notificationSettings?.browser.lowQuotaWarning).toBe(true);
    });

    it('should create settings if not exist', async () => {
      const newUser = await createTestUser(testDb as any, { email: 'notif@test.com' });

      const updated = await repo.updateNotificationSettings(newUser.id, {
        frequency: 'daily', // Changed from 'weekly' which is not a valid frequency
      });

      expect(updated.notificationSettings?.frequency).toBe('daily');
    });
  });

  describe('updateDefaultGenerationSettings', () => {
    it('should merge generation settings', async () => {
      await repo.getOrCreate(testUserId);

      const updated = await repo.updateDefaultGenerationSettings(testUserId, {
        varietyLevel: 75,
      });

      // Original values preserved
      expect(updated.defaultGenerationSettings?.aspectRatio).toBe('1:1');
      expect(updated.defaultGenerationSettings?.matchProductColors).toBe(true);
      // New value updated
      expect(updated.defaultGenerationSettings?.varietyLevel).toBe(75);
    });

    it('should update aspectRatio', async () => {
      await repo.getOrCreate(testUserId);

      const updated = await repo.updateDefaultGenerationSettings(testUserId, {
        aspectRatio: '16:9',
      });

      expect(updated.defaultGenerationSettings?.aspectRatio).toBe('16:9');
    });

    it('should update matchProductColors', async () => {
      await repo.getOrCreate(testUserId);

      const updated = await repo.updateDefaultGenerationSettings(testUserId, {
        matchProductColors: false,
      });

      expect(updated.defaultGenerationSettings?.matchProductColors).toBe(false);
    });

    it('should create settings if not exist', async () => {
      const newUser = await createTestUser(testDb as any, { email: 'gensettings@test.com' });

      const updated = await repo.updateDefaultGenerationSettings(newUser.id, {
        aspectRatio: '16:9',
      });

      expect(updated.defaultGenerationSettings?.aspectRatio).toBe('16:9');
    });

    it('should preserve existing values when updating single field', async () => {
      await repo.getOrCreate(testUserId);

      // Update varietyLevel
      await repo.updateDefaultGenerationSettings(testUserId, { varietyLevel: 90 });

      // Update aspectRatio
      const updated = await repo.updateDefaultGenerationSettings(testUserId, { aspectRatio: '9:16' });

      // Both values should be present
      expect(updated.defaultGenerationSettings?.varietyLevel).toBe(90);
      expect(updated.defaultGenerationSettings?.aspectRatio).toBe('9:16');
      expect(updated.defaultGenerationSettings?.matchProductColors).toBe(true);
    });
  });
});
