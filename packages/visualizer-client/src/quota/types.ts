/**
 * Quota Service Types
 */

export type PlanType = 'free' | 'starter' | 'pro' | 'basic' | 'growth' | 'scale' | 'enterprise';

export interface PlanLimits {
  plan: PlanType;
  monthlyGenerations: number;
  storageMb: number;
  maxProductsPerSession: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    plan: 'free',
    monthlyGenerations: 100,
    storageMb: 1000, // 1GB
    maxProductsPerSession: 10,
  },
  starter: {
    plan: 'starter',
    monthlyGenerations: 500,
    storageMb: 5000, // 5GB
    maxProductsPerSession: 50,
  },
  pro: {
    plan: 'pro',
    monthlyGenerations: 2000,
    storageMb: 20000, // 20GB
    maxProductsPerSession: 200,
  },
  basic: {
    plan: 'basic',
    monthlyGenerations: 2000,
    storageMb: 5000, // 5GB
    maxProductsPerSession: 100,
  },
  growth: {
    plan: 'growth',
    monthlyGenerations: 4500,
    storageMb: 20000, // 20GB
    maxProductsPerSession: 500,
  },
  scale: {
    plan: 'scale',
    monthlyGenerations: 7000,
    storageMb: 50000, // 50GB
    maxProductsPerSession: 1000,
  },
  enterprise: {
    plan: 'enterprise',
    monthlyGenerations: -1, // unlimited
    storageMb: -1, // unlimited
    maxProductsPerSession: -1, // unlimited
  },
};

export interface QuotaStatus {
  plan: PlanType;
  usage: {
    generationsUsed: number;
    generationsLimit: number;
    generationsRemaining: number;
    usagePercent: number;
  };
  isUnlimited: boolean;
  isAtLimit: boolean;
  isNearLimit: boolean; // > 80%
  resetDate: Date;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  remaining: number;
}
