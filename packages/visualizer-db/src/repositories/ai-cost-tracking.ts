/**
 * AI Cost Tracking Repository
 *
 * Tracks detailed costs per AI operation for:
 * - Billing and invoicing
 * - Usage analytics
 * - Cost optimization
 * - Quota enforcement
 */

import type { DrizzleClient } from '../client';
import { aiCostTracking, type AIOperationType } from '../schema/usage';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface CreateCostRecord {
  clientId: string;
  userId?: string;
  requestId?: string;
  jobId?: string;
  operationType: AIOperationType;
  model: string;
  provider?: string;
  costUsdCents: number; // Cost in USD cents (e.g., 100 = $1.00)
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  videoDurationSeconds?: number;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  durationMs?: number;
}

export interface CostSummary {
  totalCostUsdCents: number; // Cost in USD cents (e.g., 100 = $1.00)
  operationCount: number;
  successCount: number;
  failureCount: number;
  byOperationType: Record<string, { costUsdCents: number; count: number }>;
  byModel: Record<string, { costUsdCents: number; count: number }>;
}

export class AICostTrackingRepository {
  constructor(private readonly db: DrizzleClient) {}

  /**
   * Record a new AI operation cost
   */
  async create(data: CreateCostRecord) {
    const id = `cost_${Date.now()}_${randomUUID().substring(0, 8)}`;

    const [record] = await this.db
      .insert(aiCostTracking)
      .values({
        id,
        clientId: data.clientId,
        userId: data.userId,
        requestId: data.requestId,
        jobId: data.jobId,
        operationType: data.operationType,
        model: data.model,
        provider: data.provider ?? 'google-gemini',
        costUsdCents: data.costUsdCents,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        imageCount: data.imageCount,
        videoDurationSeconds: data.videoDurationSeconds,
        metadata: data.metadata,
        success: data.success === false ? 0 : 1,
        errorMessage: data.errorMessage,
        durationMs: data.durationMs,
      })
      .returning();

    return record;
  }

  /**
   * Get cost summary for a client (optionally filtered by date range)
   */
  async getCostSummary(
    clientId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<CostSummary> {
    const conditions = [eq(aiCostTracking.clientId, clientId)];

    if (options?.startDate) {
      conditions.push(gte(aiCostTracking.createdAt, options.startDate));
    }

    if (options?.endDate) {
      conditions.push(lte(aiCostTracking.createdAt, options.endDate));
    }

    // DB-side aggregation for overall stats
    const [overall] = await this.db
      .select({
        totalCostUsdCents: sql<number>`COALESCE(SUM(${aiCostTracking.costUsdCents}), 0)`,
        operationCount: sql<number>`COUNT(*)`,
        successCount: sql<number>`SUM(CASE WHEN ${aiCostTracking.success} = 1 THEN 1 ELSE 0 END)`,
        failureCount: sql<number>`SUM(CASE WHEN ${aiCostTracking.success} = 0 THEN 1 ELSE 0 END)`,
      })
      .from(aiCostTracking)
      .where(and(...conditions));

    // Aggregation by operation type
    const byOperationTypeRows = await this.db
      .select({
        operationType: aiCostTracking.operationType,
        costUsdCents: sql<number>`COALESCE(SUM(${aiCostTracking.costUsdCents}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(aiCostTracking)
      .where(and(...conditions))
      .groupBy(aiCostTracking.operationType);

    // Aggregation by model
    const byModelRows = await this.db
      .select({
        model: aiCostTracking.model,
        costUsdCents: sql<number>`COALESCE(SUM(${aiCostTracking.costUsdCents}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(aiCostTracking)
      .where(and(...conditions))
      .groupBy(aiCostTracking.model);

    // Convert to record format
    const byOperationType: Record<string, { costUsdCents: number; count: number }> = {};
    for (const row of byOperationTypeRows) {
      byOperationType[row.operationType] = {
        costUsdCents: row.costUsdCents,
        count: row.count,
      };
    }

    const byModel: Record<string, { costUsdCents: number; count: number }> = {};
    for (const row of byModelRows) {
      byModel[row.model] = {
        costUsdCents: row.costUsdCents,
        count: row.count,
      };
    }

    return {
      totalCostUsdCents: overall?.totalCostUsdCents ?? 0,
      operationCount: overall?.operationCount ?? 0,
      successCount: overall?.successCount ?? 0,
      failureCount: overall?.failureCount ?? 0,
      byOperationType,
      byModel,
    };
  }

  /**
   * Get recent cost records for a client
   */
  async getRecentRecords(clientId: string, limit: number = 100) {
    return this.db
      .select()
      .from(aiCostTracking)
      .where(eq(aiCostTracking.clientId, clientId))
      .orderBy(desc(aiCostTracking.createdAt))
      .limit(limit);
  }

  /**
   * Get total cost for current month (in USD cents)
   */
  async getCurrentMonthCost(clientId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const summary = await this.getCostSummary(clientId, {
      startDate: startOfMonth,
      endDate: endOfMonth,
    });

    return summary.totalCostUsdCents;
  }

  /**
   * Check if client is over budget
   * @param monthlyBudgetUsdCents - Budget in USD cents (e.g., 10000 = $100.00)
   */
  async isOverBudget(clientId: string, monthlyBudgetUsdCents: number): Promise<boolean> {
    const currentCost = await this.getCurrentMonthCost(clientId);
    // Being exactly at budget is not considered over budget
    return currentCost > monthlyBudgetUsdCents;
  }
}
