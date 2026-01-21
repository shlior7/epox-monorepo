/**
 * AI Cost Tracker
 *
 * Helper to track AI operation costs in the database.
 * Automatically integrates with logger for request tracing.
 */

import type { DatabaseFacade } from 'visualizer-db';
import type { AIOperationType, CreateCostRecord } from 'visualizer-db/repositories';
import { createLogger, type Logger } from './logger';

// Singleton cost tracker instance
let costTrackerInstance: CostTracker | null = null;
let dbInstance: DatabaseFacade | null = null;

/**
 * Initialize cost tracking with database
 */
export function initCostTracking(db: DatabaseFacade): void {
  dbInstance = db;
  costTrackerInstance = new CostTracker(db.aiCostTracking);
  console.log('✅ Cost tracking initialized');
}

/**
 * Get the singleton cost tracker instance
 */
export function getCostTracker(): CostTracker {
  if (!costTrackerInstance || !dbInstance) {
    throw new Error('Cost tracker not initialized. Call initCostTracking() first.');
  }
  return costTrackerInstance;
}

/**
 * Check if cost tracking is initialized
 */
export function isCostTrackingInitialized(): boolean {
  return costTrackerInstance !== null && dbInstance !== null;
}

/**
 * Cost tracking helper
 */
export class CostTracker {
  constructor(private repository: DatabaseFacade['aiCostTracking']) {}

  /**
   * Track an AI operation cost
   */
  async trackCost(data: Omit<CreateCostRecord, 'provider'> & { provider?: string; logger?: Logger }): Promise<void> {
    try {
      // Extract request ID from logger if provided
      const requestId = data.logger?.getRequestId() ?? data.requestId;

      await this.repository.create({
        ...data,
        requestId,
        provider: data.provider ?? 'google-gemini',
      });

      // Log the cost tracking
      if (data.logger) {
        data.logger.info('Cost tracked', {
          costUsdCents: data.costUsdCents,
          model: data.model,
          operationType: data.operationType,
        });
      }
    } catch (error) {
      console.error('❌ Failed to track cost:', error);
      // Don't throw - cost tracking should not break the application
    }
  }

  /**
   * Get cost summary for a client
   */
  async getCostSummary(clientId: string, options?: { startDate?: Date; endDate?: Date }) {
    return this.repository.getCostSummary(clientId, options);
  }

  /**
   * Get current month cost
   */
  async getCurrentMonthCost(clientId: string): Promise<number> {
    return this.repository.getCurrentMonthCost(clientId);
  }

  /**
   * Check if over budget
   * @param monthlyBudgetUsdCents - Budget in USD cents (e.g., 10000 = $100.00)
   */
  async isOverBudget(clientId: string, monthlyBudgetUsdCents: number): Promise<boolean> {
    return this.repository.isOverBudget(clientId, monthlyBudgetUsdCents);
  }
}

/**
 * Helper to wrap an AI operation with cost tracking
 */
export async function trackAIOperation<T>(
  operation: () => Promise<T>,
  costData: {
    clientId: string;
    userId?: string;
    operationType: AIOperationType;
    model: string;
    estimatedCostUsdCents: number; // Cost in USD cents (e.g., 100 = $1.00)
    logger?: Logger;
    jobId?: string;
    imageCount?: number;
    videoDurationSeconds?: number;
  }
): Promise<T> {
  const startTime = Date.now();
  const logger = costData.logger ?? createLogger({ operation: costData.operationType });

  try {
    const result = await operation();
    const durationMs = Date.now() - startTime;

    // Track successful operation
    if (isCostTrackingInitialized()) {
      await getCostTracker().trackCost({
        clientId: costData.clientId,
        userId: costData.userId,
        operationType: costData.operationType,
        model: costData.model,
        costUsdCents: costData.estimatedCostUsdCents,
        success: true,
        durationMs,
        logger,
        jobId: costData.jobId,
        imageCount: costData.imageCount,
        videoDurationSeconds: costData.videoDurationSeconds,
      });
    }

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Track failed operation
    if (isCostTrackingInitialized()) {
      await getCostTracker().trackCost({
        clientId: costData.clientId,
        userId: costData.userId,
        operationType: costData.operationType,
        model: costData.model,
        costUsdCents: 0, // No cost for failed operations
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
        logger,
        jobId: costData.jobId,
      });
    }

    throw error;
  }
}
