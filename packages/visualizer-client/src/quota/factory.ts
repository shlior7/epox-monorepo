/**
 * QuotaService Factory
 * Creates a QuotaService wired to real database repositories.
 */

import type { DatabaseFacade } from 'visualizer-db';
import type { PlanType } from './types';
import { QuotaService } from './service';

/**
 * Create a QuotaService instance wired to the database facade.
 */
export function createQuotaServiceFromDb(db: DatabaseFacade): QuotaService {
  return new QuotaService({
    getUsage: (clientId: string) => db.usageRecords.getCurrentUsage(clientId),
    incrementUsage: (clientId: string, count: number) =>
      db.usageRecords.incrementUsage(clientId, undefined, count).then(() => undefined),
    getClientPlan: async (clientId: string): Promise<PlanType> => {
      const quota = await db.quotaLimits.getOrCreate(clientId);
      return quota.plan as PlanType;
    },
  });
}
