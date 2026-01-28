/**
 * Quota Enforcement Helper Tests
 * Tests the enforceQuota and consumeCredits helpers used by API routes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the db module before importing quota helpers
vi.mock('@/lib/services/db', () => ({
  db: {
    usageRecords: {
      getCurrentUsage: vi.fn(),
      incrementUsage: vi.fn(),
    },
    quotaLimits: {
      getOrCreate: vi.fn(),
    },
  },
}));

import { db } from '@/lib/services/db';
import { enforceQuota, consumeCredits, getQuotaService } from '@/lib/services/quota';

describe('Quota Enforcement Helper', () => {
  const clientId = 'test-client-1';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: free plan, 0 usage
    vi.mocked(db.quotaLimits.getOrCreate).mockResolvedValue({
      id: 'ql-1',
      clientId,
      plan: 'free',
      monthlyGenerationLimit: 100,
      storageQuotaMb: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(db.usageRecords.getCurrentUsage).mockResolvedValue(0);
    vi.mocked(db.usageRecords.incrementUsage).mockResolvedValue({
      id: 'ur-1',
      clientId,
      userId: null,
      month: '2026-01',
      generationCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  });

  describe('enforceQuota', () => {
    it('should return null when credits available', async () => {
      vi.mocked(db.usageRecords.getCurrentUsage).mockResolvedValue(50);

      const result = await enforceQuota(clientId);

      expect(result).toBeNull();
    });

    it('should return 402 response when credits exhausted', async () => {
      vi.mocked(db.usageRecords.getCurrentUsage).mockResolvedValue(100);

      const result = await enforceQuota(clientId);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(402);

      const data = await result!.json();
      expect(data.error).toBe('Credit limit reached');
      expect(data.reason).toBeDefined();
      expect(data.currentUsage).toBe(100);
      expect(data.limit).toBe(100);
      expect(data.remaining).toBe(0);
    });

    it('should return 402 when requesting more than remaining', async () => {
      vi.mocked(db.usageRecords.getCurrentUsage).mockResolvedValue(98);

      const result = await enforceQuota(clientId, 5);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(402);
    });

    it('should return null for enterprise plan regardless of usage', async () => {
      vi.mocked(db.quotaLimits.getOrCreate).mockResolvedValue({
        id: 'ql-1',
        clientId,
        plan: 'enterprise',
        monthlyGenerationLimit: -1,
        storageQuotaMb: -1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(db.usageRecords.getCurrentUsage).mockResolvedValue(999999);

      const result = await enforceQuota(clientId);

      expect(result).toBeNull();
    });

    it('should default count to 1', async () => {
      vi.mocked(db.usageRecords.getCurrentUsage).mockResolvedValue(99);

      const result = await enforceQuota(clientId);

      expect(result).toBeNull();
    });
  });

  describe('consumeCredits', () => {
    it('should call consumeQuota on the service', async () => {
      vi.mocked(db.usageRecords.getCurrentUsage).mockResolvedValue(10);

      await consumeCredits(clientId, 3);

      expect(db.usageRecords.incrementUsage).toHaveBeenCalled();
    });

    it('should default count to 1', async () => {
      vi.mocked(db.usageRecords.getCurrentUsage).mockResolvedValue(0);

      await consumeCredits(clientId);

      expect(db.usageRecords.incrementUsage).toHaveBeenCalled();
    });
  });

  describe('getQuotaService', () => {
    it('should return a QuotaService instance', () => {
      const service = getQuotaService();

      expect(service).toBeDefined();
      expect(typeof service.checkQuota).toBe('function');
      expect(typeof service.consumeQuota).toBe('function');
      expect(typeof service.getQuotaStatus).toBe('function');
    });

    it('should return singleton (same instance)', () => {
      const service1 = getQuotaService();
      const service2 = getQuotaService();

      expect(service1).toBe(service2);
    });
  });
});
