import { NextResponse } from 'next/server';
import { withAdminReadSecurity } from '@/lib/security/admin-middleware';
import { getDb } from 'visualizer-db';
import { client, user, product, generatedAsset, aiCostTracking } from 'visualizer-db/schema';
import { sql, and, gte } from 'drizzle-orm';

/**
 * Dashboard Metrics API
 *
 * Returns platform-wide metrics:
 * - Total clients, users, products, generations
 * - Current month AI cost across all clients
 * - Active clients (with recent activity)
 */
export const GET = withAdminReadSecurity(async () => {
  try {
    const drizzle = getDb();

    // Run all queries in parallel for performance
    const [
      clientsResult,
      usersResult,
      productsResult,
      assetsResult,
      costResult,
      activeClientsResult,
    ] = await Promise.all([
      // Total clients
      drizzle
        .select({ count: sql<number>`COUNT(*)` })
        .from(client)
        .then((rows) => rows[0]?.count ?? 0),

      // Total users
      drizzle
        .select({ count: sql<number>`COUNT(*)` })
        .from(user)
        .then((rows) => rows[0]?.count ?? 0),

      // Total products
      drizzle
        .select({ count: sql<number>`COUNT(*)` })
        .from(product)
        .then((rows) => rows[0]?.count ?? 0),

      // Total generated assets
      drizzle
        .select({ count: sql<number>`COUNT(*)` })
        .from(generatedAsset)
        .then((rows) => rows[0]?.count ?? 0),

      // Current month total cost (all clients)
      getCurrentMonthTotalCost(drizzle),

      // Active clients (with generations in last 30 days)
      getActiveClientsCount(drizzle),
    ]);

    const metrics = {
      totalClients: clientsResult,
      totalUsers: usersResult,
      totalProducts: productsResult,
      totalGenerations: assetsResult,
      currentMonthCostUsd: costResult / 100, // Convert cents to dollars
      activeClients: activeClientsResult,
    };

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
});

/**
 * Get total cost for current month across all clients
 */
async function getCurrentMonthTotalCost(drizzle: ReturnType<typeof getDb>): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [totalCost] = await drizzle
    .select({
      total: sql<number>`COALESCE(SUM(${aiCostTracking.costUsdCents}), 0)`,
    })
    .from(aiCostTracking)
    .where(
      and(
        gte(aiCostTracking.createdAt, startOfMonth),
        sql`${aiCostTracking.createdAt} <= ${endOfMonth}`
      )
    );

  return totalCost?.total ?? 0;
}

/**
 * Get count of clients with activity in last 30 days
 */
async function getActiveClientsCount(drizzle: ReturnType<typeof getDb>): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [result] = await drizzle
    .select({
      count: sql<number>`COUNT(DISTINCT ${generatedAsset.clientId})`,
    })
    .from(generatedAsset)
    .where(gte(generatedAsset.createdAt, thirtyDaysAgo));

  return result?.count ?? 0;
}
