/**
 * Dashboard API Route
 * Production-ready with repository facades for aggregation queries
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';

export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Execute all count queries in parallel for performance
    const [productCount, collectionCount, completedAssetsCount] = await Promise.all([
      db.products.count(clientId),
      db.collectionSessions.count(clientId),
      db.generatedAssets.countByStatus(clientId, 'completed'),
    ]);

    const stats = {
      totalProducts: productCount,
      totalCollections: collectionCount,
      totalGenerated: completedAssetsCount,
      creditsRemaining: 500, // TODO: Integrate with quota service
    };

    // Get 3 most recent collections
    const recentCollectionsData = await db.collectionSessions.listRecent(clientId, 3);
    const recentCollectionIds = recentCollectionsData.map((collection) => collection.id);

    const recentFlows = await db.generationFlows.listByCollectionSessionIds(recentCollectionIds);
    const flowIdsByCollection = new Map<string, string[]>();

    for (const flow of recentFlows) {
      const collectionId = flow.collectionSessionId;
      if (!collectionId) continue;
      const existing = flowIdsByCollection.get(collectionId) ?? [];
      existing.push(flow.id);
      flowIdsByCollection.set(collectionId, existing);
    }

    // For each collection, count its assets (in parallel)
    const recentCollections = await Promise.all(
      recentCollectionsData.map(async (c) => {
        const flowIds = flowIdsByCollection.get(c.id) ?? [];
        const [totalCount, completedCount, firstAsset] = await Promise.all([
          db.generatedAssets.countByGenerationFlowIds(clientId, flowIds),
          db.generatedAssets.countByGenerationFlowIds(clientId, flowIds, 'completed'),
          db.generatedAssets.getFirstByGenerationFlowIds(clientId, flowIds, 'completed'),
        ]);

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          productCount: c.productIds.length,
          generatedCount: completedCount,
          totalImages: totalCount,
          updatedAt: c.updatedAt.toISOString(),
          thumbnailUrl: firstAsset?.assetUrl || '',
        };
      })
    );

    return NextResponse.json({
      stats,
      recentCollections,
    });
  } catch (error: unknown) {
    console.error('❌ Failed to fetch dashboard data:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
