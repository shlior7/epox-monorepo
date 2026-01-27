import { NextRequest, NextResponse } from 'next/server';
import { withAdminReadSecurity } from '@/lib/security/admin-middleware';
import { getDb } from 'visualizer-db';
import { client, member, product, generatedAsset, aiCostTracking } from 'visualizer-db/schema';
import { sql, ilike, asc, desc } from 'drizzle-orm';

/**
 * Client List API
 *
 * GET: List all clients with summary stats
 * Query params:
 * - search: Filter by client name
 * - sort: Sort field (name, created, cost)
 * - order: Sort order (asc, desc)
 * - limit: Page size (default: 20)
 * - offset: Page offset (default: 0)
 */
export const GET = withAdminReadSecurity(async (request: NextRequest) => {
  try {
    const drizzle = getDb();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sort') || 'created';
    const sortOrder = searchParams.get('order') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build base query with filters
    let query = drizzle.select().from(client).$dynamic();

    if (search) {
      query = query.where(ilike(client.name, `%${search}%`));
    }

    // Apply sorting
    const orderFn = sortOrder === 'asc' ? asc : desc;
    if (sortField === 'name') {
      query = query.orderBy(orderFn(client.name));
    } else if (sortField === 'created') {
      query = query.orderBy(orderFn(client.createdAt));
    } else {
      query = query.orderBy(orderFn(client.createdAt));
    }

    // Pagination
    query = query.limit(limit).offset(offset);

    const clients = await query;

    // Get stats for each client in parallel
    const clientsWithStats = await Promise.all(
      clients.map(async (c) => {
        const [userCount, productCount, generationCount, currentMonthCost] = await Promise.all([
          // User count
          drizzle
            .select({ count: sql<number>`COUNT(*)` })
            .from(member)
            .where(sql`${member.clientId} = ${c.id}`)
            .then((rows) => rows[0]?.count ?? 0),

          // Product count
          drizzle
            .select({ count: sql<number>`COUNT(*)` })
            .from(product)
            .where(sql`${product.clientId} = ${c.id}`)
            .then((rows) => rows[0]?.count ?? 0),

          // Generation count (generatedAsset has clientId directly)
          drizzle
            .select({ count: sql<number>`COUNT(*)` })
            .from(generatedAsset)
            .where(sql`${generatedAsset.clientId} = ${c.id}`)
            .then((rows) => rows[0]?.count ?? 0),

          // Current month cost
          getCurrentMonthCostForClient(drizzle, c.id),
        ]);

        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          logo: c.logo,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          stats: {
            userCount,
            productCount,
            generationCount,
            currentMonthCostUsd: currentMonthCost / 100, // Convert cents to dollars
          },
        };
      })
    );

    // Get total count for pagination
    const [totalResult] = await drizzle
      .select({ count: sql<number>`COUNT(*)` })
      .from(client)
      .where(search ? ilike(client.name, `%${search}%`) : undefined);

    const total = totalResult?.count ?? 0;

    return NextResponse.json({
      clients: clientsWithStats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
});

/**
 * Get current month cost for a specific client
 */
async function getCurrentMonthCostForClient(
  drizzle: ReturnType<typeof getDb>,
  clientId: string
): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [result] = await drizzle
    .select({
      total: sql<number>`COALESCE(SUM(${aiCostTracking.costUsdCents}), 0)`,
    })
    .from(aiCostTracking)
    .where(
      sql`${aiCostTracking.clientId} = ${clientId} AND ${aiCostTracking.createdAt} >= ${startOfMonth} AND ${aiCostTracking.createdAt} <= ${endOfMonth}`
    );

  return result?.total ?? 0;
}
