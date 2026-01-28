/**
 * Quota Enforcement Helper
 * Provides singleton QuotaService and convenience functions for API endpoints.
 */

import { NextResponse } from 'next/server';
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
 * Returns a 402 NextResponse if quota is exceeded, or null if allowed.
 */
export async function enforceQuota(clientId: string, count = 1): Promise<NextResponse | null> {
  const service = getQuotaService();
  const result = await service.checkQuota(clientId, count);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Credit limit reached',
        reason: result.reason,
        currentUsage: result.currentUsage,
        limit: result.limit,
        remaining: result.remaining,
      },
      { status: 402 }
    );
  }

  return null;
}

/**
 * Consume credits after a successful operation.
 */
export async function consumeCredits(clientId: string, count = 1): Promise<void> {
  const service = getQuotaService();
  await service.consumeQuota(clientId, count);
}
