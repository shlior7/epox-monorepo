/**
 * Usage Record and Quota Limit Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { UsageRecordRepository, QuotaLimitRepository } from '../../repositories/usage';
import { testDb } from '../setup';
import { createTestClient, createTestUser, createTestId } from '../helpers';

describe('UsageRecordRepository', () => {
  let repo: UsageRecordRepository;
  let testClientId: string;
  let testUserId: string;

  beforeEach(async () => {
    repo = new UsageRecordRepository(testDb as any);

    const client = await createTestClient(testDb as any);
    testClientId = client.id;

    const user = await createTestUser(testDb as any);
    testUserId = user.id;
  });

  describe('getByClientAndMonth', () => {
    it('should return record for client and month', async () => {
      await repo.getOrCreate(testClientId, testUserId);
      await repo.incrementUsage(testClientId, testUserId, 5);

      const record = await repo.getByClientAndMonth(testClientId);

      expect(record).toBeDefined();
      expect(record?.clientId).toBe(testClientId);
      expect(record?.generationCount).toBe(5);
    });

    it('should return null for non-existent record', async () => {
      const record = await repo.getByClientAndMonth(testClientId);
      expect(record).toBeNull();
    });

    it('should use current month by default', async () => {
      await repo.getOrCreate(testClientId);

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const record = await repo.getByClientAndMonth(testClientId);
      expect(record?.month).toBe(currentMonth);
    });

    it('should accept specific month', async () => {
      // Create for specific month
      const specificMonth = '2024-06';
      const usageId = createTestId('usage');
      const now = new Date();
      await testDb.execute(sql`
        INSERT INTO usage_record (id, client_id, month, generation_count, created_at, updated_at)
        VALUES (${usageId}, ${testClientId}, ${specificMonth}, 10, ${now}, ${now})
      `);

      const record = await repo.getByClientAndMonth(testClientId, specificMonth);

      expect(record).toBeDefined();
      expect(record?.month).toBe(specificMonth);
      expect(record?.generationCount).toBe(10);
    });
  });

  describe('getOrCreate', () => {
    it('should return existing record', async () => {
      const first = await repo.getOrCreate(testClientId, testUserId);
      const second = await repo.getOrCreate(testClientId, testUserId);

      expect(first.id).toBe(second.id);
    });

    it('should create new record if not exists', async () => {
      const record = await repo.getOrCreate(testClientId, testUserId);

      expect(record).toBeDefined();
      expect(record.clientId).toBe(testClientId);
      expect(record.userId).toBe(testUserId);
      expect(record.generationCount).toBe(0);
    });

    it('should create record without userId', async () => {
      const record = await repo.getOrCreate(testClientId);

      expect(record.clientId).toBe(testClientId);
      expect(record.userId).toBeNull();
    });

    it('should set timestamps', async () => {
      const record = await repo.getOrCreate(testClientId);

      expect(record.createdAt).toBeInstanceOf(Date);
      expect(record.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('incrementUsage', () => {
    it('should increment generation count', async () => {
      await repo.incrementUsage(testClientId, testUserId, 5);
      await repo.incrementUsage(testClientId, testUserId, 3);

      const record = await repo.getByClientAndMonth(testClientId);

      expect(record?.generationCount).toBe(8);
    });

    it('should create record if needed', async () => {
      const result = await repo.incrementUsage(testClientId, testUserId, 10);

      expect(result.generationCount).toBe(10);
    });

    it('should default increment to 1', async () => {
      await repo.incrementUsage(testClientId, testUserId);
      await repo.incrementUsage(testClientId, testUserId);
      await repo.incrementUsage(testClientId, testUserId);

      const record = await repo.getByClientAndMonth(testClientId);

      expect(record?.generationCount).toBe(3);
    });

    it('should update updatedAt timestamp', async () => {
      await repo.getOrCreate(testClientId);
      const before = await repo.getByClientAndMonth(testClientId);

      await new Promise((resolve) => setTimeout(resolve, 10));
      await repo.incrementUsage(testClientId, testUserId, 1);

      const after = await repo.getByClientAndMonth(testClientId);

      expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime());
    });
  });

  describe('getCurrentUsage', () => {
    it('should return current generation count', async () => {
      await repo.incrementUsage(testClientId, testUserId, 15);

      const usage = await repo.getCurrentUsage(testClientId);

      expect(usage).toBe(15);
    });

    it('should return 0 for client with no usage record', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'No Usage' });
      const usage = await repo.getCurrentUsage(newClient.id);

      expect(usage).toBe(0);
    });
  });
});

describe('QuotaLimitRepository', () => {
  let repo: QuotaLimitRepository;
  let testClientId: string;

  beforeEach(async () => {
    repo = new QuotaLimitRepository(testDb as any);

    const client = await createTestClient(testDb as any);
    testClientId = client.id;
  });

  describe('getByClientId', () => {
    it('should return quota for client', async () => {
      await repo.create({ clientId: testClientId, plan: 'pro', monthlyGenerationLimit: 500 });

      const quota = await repo.getByClientId(testClientId);

      expect(quota).toBeDefined();
      expect(quota?.clientId).toBe(testClientId);
      expect(quota?.plan).toBe('pro');
      expect(quota?.monthlyGenerationLimit).toBe(500);
    });

    it('should return null for client with no quota', async () => {
      const quota = await repo.getByClientId(testClientId);
      expect(quota).toBeNull();
    });
  });

  describe('getOrCreate', () => {
    it('should return existing quota', async () => {
      await repo.create({ clientId: testClientId, plan: 'enterprise' });

      const quota = await repo.getOrCreate(testClientId);

      expect(quota.plan).toBe('enterprise');
    });

    it('should create with defaults if not exists', async () => {
      const quota = await repo.getOrCreate(testClientId);

      expect(quota.clientId).toBe(testClientId);
      expect(quota.plan).toBe('free');
      expect(quota.monthlyGenerationLimit).toBe(100);
      expect(quota.storageQuotaMb).toBe(1000);
    });
  });

  describe('create', () => {
    it('should create quota with custom values', async () => {
      const quota = await repo.create({
        clientId: testClientId,
        plan: 'pro',
        monthlyGenerationLimit: 1000,
        storageQuotaMb: 5000,
      });

      expect(quota.plan).toBe('pro');
      expect(quota.monthlyGenerationLimit).toBe(1000);
      expect(quota.storageQuotaMb).toBe(5000);
    });

    it('should use defaults when values not provided', async () => {
      const quota = await repo.create({ clientId: testClientId });

      expect(quota.plan).toBe('free');
      expect(quota.monthlyGenerationLimit).toBe(100);
      expect(quota.storageQuotaMb).toBe(1000);
    });

    it('should set timestamps', async () => {
      const quota = await repo.create({ clientId: testClientId });

      expect(quota.createdAt).toBeInstanceOf(Date);
      expect(quota.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update plan', async () => {
      await repo.create({ clientId: testClientId, plan: 'free' });

      const updated = await repo.update(testClientId, { plan: 'pro' });

      expect(updated.plan).toBe('pro');
    });

    it('should update monthlyGenerationLimit', async () => {
      await repo.create({ clientId: testClientId });

      const updated = await repo.update(testClientId, { monthlyGenerationLimit: 500 });

      expect(updated.monthlyGenerationLimit).toBe(500);
    });

    it('should update storageQuotaMb', async () => {
      await repo.create({ clientId: testClientId });

      const updated = await repo.update(testClientId, { storageQuotaMb: 10000 });

      expect(updated.storageQuotaMb).toBe(10000);
    });

    it('should update multiple fields', async () => {
      await repo.create({ clientId: testClientId });

      const updated = await repo.update(testClientId, {
        plan: 'enterprise',
        monthlyGenerationLimit: 10000,
        storageQuotaMb: 50000,
      });

      expect(updated.plan).toBe('enterprise');
      expect(updated.monthlyGenerationLimit).toBe(10000);
      expect(updated.storageQuotaMb).toBe(50000);
    });

    it('should throw for non-existent client', async () => {
      await expect(repo.update('non-existent', { plan: 'pro' })).rejects.toThrow();
    });

    it('should update updatedAt timestamp', async () => {
      await repo.create({ clientId: testClientId });
      const before = await repo.getByClientId(testClientId);

      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await repo.update(testClientId, { plan: 'pro' });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime());
    });
  });
});
