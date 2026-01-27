import { NextRequest, NextResponse } from 'next/server';
import { withAdminReadSecurity } from '@/lib/security/admin-middleware';
import { db } from 'visualizer-db';

/**
 * Client Analytics API
 *
 * GET: Get analytics data for a specific client
 * Query params:
 * - period: 7d, 30d, 90d (default: 30d)
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 */
export const GET = withAdminReadSecurity(
  async (request, _context, routeContext) => {
    try {
      const { id: clientId } = await routeContext.params as { id: string };
      const { searchParams } = new URL(request.url);

      // Verify client exists
      const client = await db.clients.getById(clientId);
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      // Parse date range
      const period = searchParams.get('period') || '30d';
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');

      let startDate: Date;
      let endDate = new Date();

      if (startDateParam && endDateParam) {
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
      } else {
        // Calculate based on period
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      // Get analytics data in parallel
      const [costSummary, currentUsage, quota, recentCostRecords] = await Promise.all([
        // Cost summary for period
        db.aiCostTracking.getCostSummary(clientId, { startDate, endDate }),

        // Current month usage
        db.usageRecords.getCurrentUsage(clientId),

        // Quota limits
        db.quotaLimits.getByClientId(clientId),

        // Recent cost records for trend analysis
        db.aiCostTracking.getRecentRecords(clientId, 100),
      ]);

      // Calculate daily cost breakdown
      const dailyCosts = calculateDailyCosts(recentCostRecords, startDate, endDate);

      // Calculate quota usage percentage
      const quotaUsagePercentage = quota
        ? (currentUsage / quota.monthlyGenerationLimit) * 100
        : 0;

      return NextResponse.json({
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        costSummary: {
          totalCostUsd: costSummary.totalCostUsdCents / 100,
          operationCount: costSummary.operationCount,
          successCount: costSummary.successCount,
          failureCount: costSummary.failureCount,
          byOperationType: Object.entries(costSummary.byOperationType).map(([type, data]) => ({
            type,
            costUsd: data.costUsdCents / 100,
            count: data.count,
          })),
          byModel: Object.entries(costSummary.byModel).map(([model, data]) => ({
            model,
            costUsd: data.costUsdCents / 100,
            count: data.count,
          })),
        },
        quota: quota
          ? {
              plan: quota.plan,
              monthlyGenerationLimit: quota.monthlyGenerationLimit,
              currentUsage,
              usagePercentage: quotaUsagePercentage,
              storageQuotaMb: quota.storageQuotaMb,
            }
          : null,
        dailyCosts,
      });
    } catch (error) {
      console.error('Failed to fetch client analytics:', error);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
  }
);

/**
 * Calculate daily cost breakdown from cost records
 */
function calculateDailyCosts(
  records: Array<{ createdAt: Date; costUsdCents: number }>,
  startDate: Date,
  endDate: Date
): Array<{ date: string; costUsd: number }> {
  const dailyMap = new Map<string, number>();

  // Initialize all days in range with 0
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    dailyMap.set(dateStr, 0);
    current.setDate(current.getDate() + 1);
  }

  // Sum costs by day
  for (const record of records) {
    const dateStr = new Date(record.createdAt).toISOString().split('T')[0];
    if (dailyMap.has(dateStr)) {
      const currentCost = dailyMap.get(dateStr) || 0;
      dailyMap.set(dateStr, currentCost + record.costUsdCents);
    }
  }

  // Convert to array and sort by date
  return Array.from(dailyMap.entries())
    .map(([date, costCents]) => ({
      date,
      costUsd: costCents / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
