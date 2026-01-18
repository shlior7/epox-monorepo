/**
 * Quota Service
 * Manages usage quotas and limits for clients
 */

import type {
  PlanType,
  PlanLimits,
  QuotaStatus,
  QuotaCheckResult,
} from './types';
import { PLAN_LIMITS } from './types';

export interface QuotaServiceDependencies {
  // These would be actual repository instances in production
  getUsage: (clientId: string, month?: string) => Promise<number>;
  incrementUsage: (clientId: string, count: number) => Promise<void>;
  getClientPlan: (clientId: string) => Promise<PlanType>;
}

export class QuotaService {
  private readonly deps: QuotaServiceDependencies;

  constructor(deps: QuotaServiceDependencies) {
    this.deps = deps;
  }

  /**
   * Get the current month string (YYYY-MM)
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get the next month's first day (reset date)
   */
  private getResetDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Get limits for a plan
   */
  getPlanLimits(plan: PlanType): PlanLimits {
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  }

  /**
   * Get full quota status for a client
   */
  async getQuotaStatus(clientId: string): Promise<QuotaStatus> {
    const plan = await this.deps.getClientPlan(clientId);
    const limits = this.getPlanLimits(plan);
    const usage = await this.deps.getUsage(clientId);

    const isUnlimited = limits.monthlyGenerations === -1;
    const generationsLimit = isUnlimited ? Infinity : limits.monthlyGenerations;
    const generationsRemaining = isUnlimited ? Infinity : Math.max(0, limits.monthlyGenerations - usage);
    const usagePercent = isUnlimited ? 0 : Math.round((usage / limits.monthlyGenerations) * 100);

    return {
      plan,
      usage: {
        generationsUsed: usage,
        generationsLimit: limits.monthlyGenerations,
        generationsRemaining,
        usagePercent,
      },
      isUnlimited,
      isAtLimit: !isUnlimited && usage >= limits.monthlyGenerations,
      isNearLimit: !isUnlimited && usagePercent >= 80,
      resetDate: this.getResetDate(),
    };
  }

  /**
   * Check if a client can perform a specific number of generations
   */
  async checkQuota(clientId: string, count = 1): Promise<QuotaCheckResult> {
    const status = await this.getQuotaStatus(clientId);

    if (status.isUnlimited) {
      return {
        allowed: true,
        currentUsage: status.usage.generationsUsed,
        limit: -1,
        remaining: Infinity,
      };
    }

    const remaining = status.usage.generationsRemaining;
    const allowed = remaining >= count;

    return {
      allowed,
      reason: allowed ? undefined : `Monthly limit of ${status.usage.generationsLimit} generations reached. Resets on ${status.resetDate.toLocaleDateString()}.`,
      currentUsage: status.usage.generationsUsed,
      limit: status.usage.generationsLimit,
      remaining,
    };
  }

  /**
   * Consume quota (increment usage)
   */
  async consumeQuota(clientId: string, count = 1): Promise<QuotaCheckResult> {
    // First check if allowed
    const check = await this.checkQuota(clientId, count);
    if (!check.allowed) {
      return check;
    }

    // Increment usage
    await this.deps.incrementUsage(clientId, count);

    // Return updated status
    return {
      allowed: true,
      currentUsage: check.currentUsage + count,
      limit: check.limit,
      remaining: check.remaining - count,
    };
  }

  /**
   * Check if near limit (for warnings)
   */
  async shouldShowWarning(clientId: string): Promise<{ show: boolean; percent: number; remaining: number }> {
    const status = await this.getQuotaStatus(clientId);

    if (status.isUnlimited) {
      return { show: false, percent: 0, remaining: Infinity };
    }

    return {
      show: status.isNearLimit,
      percent: status.usage.usagePercent,
      remaining: status.usage.generationsRemaining,
    };
  }
}

// Factory function for creating quota service with dependencies
export function createQuotaService(deps: QuotaServiceDependencies): QuotaService {
  return new QuotaService(deps);
}


