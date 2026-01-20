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
  costUsd: number;
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
  totalCostUsd: number;
  operationCount: number;
  successCount: number;
  failureCount: number;
  byOperationType: Record<string, { costUsd: number; count: number }>;
  byModel: Record<string, { costUsd: number; count: number }>;
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
        costUsd: data.costUsd,
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

    const records = await this.db
      .select()
      .from(aiCostTracking)
      .where(and(...conditions));

    // Aggregate results
    const summary: CostSummary = {
      totalCostUsd: 0,
      operationCount: 0,
      successCount: 0,
      failureCount: 0,
      byOperationType: {},
      byModel: {},
    };

    for (const record of records) {
      summary.totalCostUsd += record.costUsd;
      summary.operationCount += 1;
      if (record.success === 1) {
        summary.successCount += 1;
      } else {
        summary.failureCount += 1;
      }

      // By operation type
      if (!summary.byOperationType[record.operationType]) {
        summary.byOperationType[record.operationType] = { costUsd: 0, count: 0 };
      }
      summary.byOperationType[record.operationType].costUsd += record.costUsd;
      summary.byOperationType[record.operationType].count += 1;

      // By model
      if (!summary.byModel[record.model]) {
        summary.byModel[record.model] = { costUsd: 0, count: 0 };
      }
      summary.byModel[record.model].costUsd += record.costUsd;
      summary.byModel[record.model].count += 1;
    }

    return summary;
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
   * Get total cost for current month
   */
  async getCurrentMonthCost(clientId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const summary = await this.getCostSummary(clientId, {
      startDate: startOfMonth,
      endDate: endOfMonth,
    });

    return summary.totalCostUsd;
  }

  /**
   * Check if client is over budget
   */
  async isOverBudget(clientId: string, monthlyBudgetUsd: number): Promise<boolean> {
    const currentCost = await this.getCurrentMonthCost(clientId);
    return currentCost >= monthlyBudgetUsd;
  }
}
