/**
 * QuotaService Unit Tests
 * Tests QuotaService with mocked dependencies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotaService, type QuotaServiceDependencies } from '../service';
import { PLAN_LIMITS } from '../types';
import type { PlanType } from '../types';

function createMockDeps(overrides: Partial<QuotaServiceDependencies> = {}): QuotaServiceDependencies {
  return {
    getUsage: vi.fn().mockResolvedValue(0),
    incrementUsage: vi.fn().mockResolvedValue(undefined),
    getClientPlan: vi.fn().mockResolvedValue('free' as PlanType),
    ...overrides,
  };
}

describe('QuotaService', () => {
  let service: QuotaService;
  let deps: QuotaServiceDependencies;
  const clientId = 'test-client-1';

  beforeEach(() => {
    deps = createMockDeps();
    service = new QuotaService(deps);
  });

  describe('getPlanLimits', () => {
    it('should return correct limits for free plan', () => {
      const limits = service.getPlanLimits('free');
      expect(limits).toEqual(PLAN_LIMITS.free);
      expect(limits.monthlyGenerations).toBe(100);
    });

    it('should return correct limits for starter plan', () => {
      const limits = service.getPlanLimits('starter');
      expect(limits).toEqual(PLAN_LIMITS.starter);
      expect(limits.monthlyGenerations).toBe(500);
    });

    it('should return correct limits for pro plan', () => {
      const limits = service.getPlanLimits('pro');
      expect(limits).toEqual(PLAN_LIMITS.pro);
      expect(limits.monthlyGenerations).toBe(2000);
    });

    it('should return correct limits for enterprise plan', () => {
      const limits = service.getPlanLimits('enterprise');
      expect(limits).toEqual(PLAN_LIMITS.enterprise);
      expect(limits.monthlyGenerations).toBe(-1);
    });

    it('should fallback to free plan for unknown plan type', () => {
      const limits = service.getPlanLimits('unknown' as PlanType);
      expect(limits).toEqual(PLAN_LIMITS.free);
    });
  });

  describe('checkQuota', () => {
    it('should allow when under limit', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(50),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.checkQuota(clientId);

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(50);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(50);
      expect(result.reason).toBeUndefined();
    });

    it('should deny when at limit', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(100),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.checkQuota(clientId);

      expect(result.allowed).toBe(false);
      expect(result.currentUsage).toBe(100);
      expect(result.remaining).toBe(0);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('Monthly limit of 100');
    });

    it('should deny when over limit', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(105),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.checkQuota(clientId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should deny when requesting more than remaining', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(98),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.checkQuota(clientId, 5);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(2);
    });

    it('should allow requesting exact remaining', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(95),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.checkQuota(clientId, 5);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should always allow for enterprise (unlimited) plan', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(999999),
        getClientPlan: vi.fn().mockResolvedValue('enterprise'),
      });
      service = new QuotaService(deps);

      const result = await service.checkQuota(clientId);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.remaining).toBe(Infinity);
    });

    it('should default count to 1', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(99),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.checkQuota(clientId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('consumeQuota', () => {
    it('should increment usage when under limit', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(10),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.consumeQuota(clientId, 3);

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(13);
      expect(result.remaining).toBe(87);
      expect(deps.incrementUsage).toHaveBeenCalledWith(clientId, 3);
    });

    it('should deny when at limit', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(100),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.consumeQuota(clientId);

      expect(result.allowed).toBe(false);
      expect(deps.incrementUsage).not.toHaveBeenCalled();
    });

    it('should not increment when insufficient remaining', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(98),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.consumeQuota(clientId, 5);

      expect(result.allowed).toBe(false);
      expect(deps.incrementUsage).not.toHaveBeenCalled();
    });

    it('should default count to 1', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(0),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const result = await service.consumeQuota(clientId);

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(1);
      expect(deps.incrementUsage).toHaveBeenCalledWith(clientId, 1);
    });

    it('should allow unlimited consumption for enterprise', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(999999),
        getClientPlan: vi.fn().mockResolvedValue('enterprise'),
      });
      service = new QuotaService(deps);

      const result = await service.consumeQuota(clientId, 100);

      expect(result.allowed).toBe(true);
      expect(deps.incrementUsage).toHaveBeenCalledWith(clientId, 100);
    });
  });

  describe('getQuotaStatus', () => {
    it('should return correct status for free plan with usage', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(50),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const status = await service.getQuotaStatus(clientId);

      expect(status.plan).toBe('free');
      expect(status.usage.generationsUsed).toBe(50);
      expect(status.usage.generationsLimit).toBe(100);
      expect(status.usage.generationsRemaining).toBe(50);
      expect(status.usage.usagePercent).toBe(50);
      expect(status.isUnlimited).toBe(false);
      expect(status.isAtLimit).toBe(false);
      expect(status.isNearLimit).toBe(false);
      expect(status.resetDate).toBeInstanceOf(Date);
    });

    it('should return isAtLimit when at limit', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(100),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const status = await service.getQuotaStatus(clientId);

      expect(status.isAtLimit).toBe(true);
      expect(status.usage.generationsRemaining).toBe(0);
      expect(status.usage.usagePercent).toBe(100);
    });

    it('should return isNearLimit when at 80% or above', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(80),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const status = await service.getQuotaStatus(clientId);

      expect(status.isNearLimit).toBe(true);
      expect(status.usage.usagePercent).toBe(80);
    });

    it('should not flag isNearLimit below 80%', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(79),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const status = await service.getQuotaStatus(clientId);

      expect(status.isNearLimit).toBe(false);
    });

    it('should return unlimited status for enterprise plan', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(5000),
        getClientPlan: vi.fn().mockResolvedValue('enterprise'),
      });
      service = new QuotaService(deps);

      const status = await service.getQuotaStatus(clientId);

      expect(status.plan).toBe('enterprise');
      expect(status.isUnlimited).toBe(true);
      expect(status.isAtLimit).toBe(false);
      expect(status.isNearLimit).toBe(false);
      expect(status.usage.generationsRemaining).toBe(Infinity);
      expect(status.usage.usagePercent).toBe(0);
    });

    it('should return correct percentages for pro plan', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(1000),
        getClientPlan: vi.fn().mockResolvedValue('pro'),
      });
      service = new QuotaService(deps);

      const status = await service.getQuotaStatus(clientId);

      expect(status.plan).toBe('pro');
      expect(status.usage.generationsLimit).toBe(2000);
      expect(status.usage.generationsRemaining).toBe(1000);
      expect(status.usage.usagePercent).toBe(50);
    });

    it('should set resetDate to first of next month', async () => {
      const status = await service.getQuotaStatus(clientId);

      const now = new Date();
      const expectedReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      expect(status.resetDate.getFullYear()).toBe(expectedReset.getFullYear());
      expect(status.resetDate.getMonth()).toBe(expectedReset.getMonth());
      expect(status.resetDate.getDate()).toBe(1);
    });
  });

  describe('shouldShowWarning', () => {
    it('should show warning when near limit', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(85),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const warning = await service.shouldShowWarning(clientId);

      expect(warning.show).toBe(true);
      expect(warning.percent).toBe(85);
      expect(warning.remaining).toBe(15);
    });

    it('should not show warning when under threshold', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(50),
        getClientPlan: vi.fn().mockResolvedValue('free'),
      });
      service = new QuotaService(deps);

      const warning = await service.shouldShowWarning(clientId);

      expect(warning.show).toBe(false);
      expect(warning.percent).toBe(50);
    });

    it('should not show warning for enterprise plan', async () => {
      deps = createMockDeps({
        getUsage: vi.fn().mockResolvedValue(999999),
        getClientPlan: vi.fn().mockResolvedValue('enterprise'),
      });
      service = new QuotaService(deps);

      const warning = await service.shouldShowWarning(clientId);

      expect(warning.show).toBe(false);
      expect(warning.percent).toBe(0);
      expect(warning.remaining).toBe(Infinity);
    });
  });
});
