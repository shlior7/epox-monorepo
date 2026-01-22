/**
 * AI Cost Tracking Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AICostTrackingRepository } from '../../repositories/ai-cost-tracking';
import { testDb } from '../setup';
import { createTestClient, createTestUser } from '../helpers';

describe('AICostTrackingRepository', () => {
  let repo: AICostTrackingRepository;
  let testClientId: string;
  let testUserId: string;

  beforeEach(async () => {
    repo = new AICostTrackingRepository(testDb as any);

    const client = await createTestClient(testDb as any);
    testClientId = client.id;

    const user = await createTestUser(testDb as any);
    testUserId = user.id;
  });

  describe('create', () => {
    it('should create a cost record with required fields', async () => {
      const record = await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro-vision',
        costUsdCents: 100,
      });

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.clientId).toBe(testClientId);
      expect(record.operationType).toBe('image_generation');
      expect(record.model).toBe('gemini-pro-vision');
      expect(record.costUsdCents).toBe(100);
    });

    it('should create record with all optional fields', async () => {
      const record = await repo.create({
        clientId: testClientId,
        userId: testUserId,
        requestId: 'req-123',
        jobId: 'job-456',
        operationType: 'product_analysis',
        model: 'gemini-1.5-pro',
        provider: 'google-gemini',
        costUsdCents: 50,
        inputTokens: 1000,
        outputTokens: 500,
        imageCount: 2,
        videoDurationSeconds: 30,
        metadata: { key: 'value' },
        success: true,
        durationMs: 2500,
      });

      expect(record.userId).toBe(testUserId);
      expect(record.requestId).toBe('req-123');
      expect(record.jobId).toBe('job-456');
      expect(record.inputTokens).toBe(1000);
      expect(record.outputTokens).toBe(500);
      expect(record.imageCount).toBe(2);
      expect(record.videoDurationSeconds).toBe(30);
      expect(record.durationMs).toBe(2500);
    });

    it('should record failures with error message', async () => {
      const record = await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 0,
        success: false,
        errorMessage: 'Rate limit exceeded',
      });

      expect(record.success).toBe(0);
      expect(record.errorMessage).toBe('Rate limit exceeded');
    });

    it('should default provider to google-gemini', async () => {
      const record = await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 50,
      });

      expect(record.provider).toBe('google-gemini');
    });
  });

  describe('getCostSummary', () => {
    beforeEach(async () => {
      // Create various cost records
      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 100,
        success: true,
      });
      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 150,
        success: true,
      });
      await repo.create({
        clientId: testClientId,
        operationType: 'product_analysis',
        model: 'gemini-1.5-pro',
        costUsdCents: 50,
        success: true,
      });
      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 0,
        success: false,
      });
    });

    it('should return cost summary', async () => {
      const summary = await repo.getCostSummary(testClientId);

      expect(Number(summary.totalCostUsdCents)).toBe(300);
      expect(Number(summary.operationCount)).toBe(4);
      expect(Number(summary.successCount)).toBe(3);
      expect(Number(summary.failureCount)).toBe(1);
    });

    it('should return breakdown by operation type', async () => {
      const summary = await repo.getCostSummary(testClientId);

      expect(summary.byOperationType['image_generation']).toBeDefined();
      expect(Number(summary.byOperationType['image_generation'].costUsdCents)).toBe(250);
      expect(Number(summary.byOperationType['image_generation'].count)).toBe(3);

      expect(summary.byOperationType['product_analysis']).toBeDefined();
      expect(Number(summary.byOperationType['product_analysis'].costUsdCents)).toBe(50);
      expect(Number(summary.byOperationType['product_analysis'].count)).toBe(1);
    });

    it('should return breakdown by model', async () => {
      const summary = await repo.getCostSummary(testClientId);

      expect(summary.byModel['gemini-pro']).toBeDefined();
      expect(Number(summary.byModel['gemini-pro'].costUsdCents)).toBe(250);
      expect(Number(summary.byModel['gemini-pro'].count)).toBe(3);

      expect(summary.byModel['gemini-1.5-pro']).toBeDefined();
      expect(Number(summary.byModel['gemini-1.5-pro'].costUsdCents)).toBe(50);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const summary = await repo.getCostSummary(testClientId, {
        startDate: yesterday,
        endDate: tomorrow,
      });

      expect(Number(summary.operationCount)).toBe(4);
    });

    it('should return zeros for client with no records', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'No Costs' });
      const summary = await repo.getCostSummary(newClient.id);

      expect(Number(summary.totalCostUsdCents)).toBe(0);
      expect(Number(summary.operationCount)).toBe(0);
      expect(Number(summary.successCount)).toBe(0);
      expect(Number(summary.failureCount)).toBe(0);
    });
  });

  describe('getRecentRecords', () => {
    it('should return recent records', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create({
          clientId: testClientId,
          operationType: 'image_generation',
          model: 'gemini-pro',
          costUsdCents: i * 10,
        });
      }

      const records = await repo.getRecentRecords(testClientId);

      expect(records.length).toBe(5);
    });

    it('should respect limit', async () => {
      for (let i = 0; i < 10; i++) {
        await repo.create({
          clientId: testClientId,
          operationType: 'image_generation',
          model: 'gemini-pro',
          costUsdCents: 10,
        });
      }

      const records = await repo.getRecentRecords(testClientId, 3);

      expect(records.length).toBe(3);
    });

    it('should return records in descending order by createdAt', async () => {
      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'first',
        costUsdCents: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'second',
        costUsdCents: 20,
      });

      const records = await repo.getRecentRecords(testClientId);

      expect(records[0].model).toBe('second'); // Most recent first
      expect(records[1].model).toBe('first');
    });
  });

  describe('getCurrentMonthCost', () => {
    it('should return cost for current month', async () => {
      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 100,
      });
      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 200,
      });

      const cost = await repo.getCurrentMonthCost(testClientId);

      expect(Number(cost)).toBe(300);
    });

    it('should return 0 for client with no records', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'No Records' });
      const cost = await repo.getCurrentMonthCost(newClient.id);

      expect(Number(cost)).toBe(0);
    });
  });

  describe('isOverBudget', () => {
    it('should return true when over budget', async () => {
      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 500,
      });

      const isOver = await repo.isOverBudget(testClientId, 400);

      expect(isOver).toBe(true);
    });

    it('should return false when under budget', async () => {
      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 300,
      });

      const isOver = await repo.isOverBudget(testClientId, 500);

      expect(isOver).toBe(false);
    });

    it('should return false when exactly at budget', async () => {
      await repo.create({
        clientId: testClientId,
        operationType: 'image_generation',
        model: 'gemini-pro',
        costUsdCents: 500,
      });

      const isOver = await repo.isOverBudget(testClientId, 500);

      expect(isOver).toBe(false); // At budget is not over
    });

    it('should return false for client with no costs', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'New Client' });
      const isOver = await repo.isOverBudget(newClient.id, 1000);

      expect(isOver).toBe(false);
    });
  });
});
