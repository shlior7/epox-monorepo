/**
 * Quota Enforcement Helper
 * Provides singleton QuotaService and convenience functions for API endpoints.
 */

import { createQuotaServiceFromDb } from 'visualizer-services';
import type { QuotaService } from 'visualizer-services';
import { db } from '@/lib/services/db';

let quotaServiceInstance: QuotaService | null = null;

/**
 * Get (or create) the singleton QuotaService instance.
 */
export function getQuotaService(): QuotaService {
  if (!quotaServiceInstance) {
    quotaServiceInstance = createQuotaServiceFromDb(db);
  }
  return quotaServiceInstance;
}

/**
 * Check if a client has enough credits for the requested operation.
 * Throws an error with status-compatible info if quota is exceeded.
 */
export async function enforceQuota(clientId: string, count = 1): Promise<void> {
  const service = getQuotaService();
  const result = await service.checkQuota(clientId, count);

  if (!result.allowed) {
    const error = new Error(result.reason ?? 'Credit limit reached');
    (error as any).status = 402;
    throw error;
  }
}

/**
 * Consume credits after a successful operation.
 */
export async function consumeCredits(clientId: string, count = 1): Promise<void> {
  const service = getQuotaService();
  await service.consumeQuota(clientId, count);
}
