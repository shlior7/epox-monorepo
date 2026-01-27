/**
 * Dashboard API Route
 * Optimized with single-query aggregation and caching
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';
import { resolveStorageUrl } from 'visualizer-storage';

// Revalidate dashboard data every 30 seconds

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
export const revalidate = 30;

export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Execute all count queries and optimized collection list in parallel
    const [
      productCount,
      collectionCount,
      completedAssetsCount,
      recentCollectionsWithStats,
      recentGeneratedAssets,
    ] = await Promise.all([
      db.products.count(clientId),
      db.collectionSessions.count(clientId),
      db.generatedAssets.countByStatus(clientId, 'completed'),
      // Use optimized single-query method (N+1 elimination)
      db.collectionSessions.listWithAssetStats(clientId, {
        sort: 'recent',
        limit: 3,
      }),
      db.generatedAssets.listWithFilters(clientId, {
        sort: 'date',
        status: 'completed',
        limit: 6,
      }),
    ]);

    const stats = {
      totalProducts: productCount,
      totalCollections: collectionCount,
      totalGenerated: completedAssetsCount,
      creditsRemaining: 500, // TODO: Integrate with quota service
    };

    // Map collections - stats already included from optimized query
    const recentCollections = recentCollectionsWithStats.map((c) => {
      // Resolve thumbnail URLs (may be relative storage keys or full URLs)
      const thumbnails = (c.thumbnails ?? [])
        .map((url) => resolveStorageUrl(url))
        .filter((url): url is string => url !== null);

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        productCount: c.productIds.length,
        generatedCount: c.completedCount,
        totalImages: c.totalImages,
        updatedAt: c.updatedAt.toISOString(),
        thumbnails,
      };
    });

    // Fetch product names for recent assets
    const productIds = [...new Set(recentGeneratedAssets.flatMap((a) => a.productIds ?? []))];
    const productsMap =
      productIds.length > 0 ? await db.products.getByIds(productIds) : new Map();

    const recentAssets = recentGeneratedAssets.map((a) => {
      const productId = a.productIds?.[0] ?? '';
      const product = productsMap.get(productId);
      const sceneTypes = (a.settings as { promptTags?: { sceneType?: string[] } } | null)
        ?.promptTags?.sceneType;

      return {
        id: a.id,
        imageUrl: a.assetUrl,
        productId,
        productName: product?.name ?? 'Unknown Product',
        productCategory: product?.category ?? undefined,
        sceneType: sceneTypes?.[0] ?? undefined,
        createdAt: a.createdAt.toISOString(),
      };
    });

    // Add cache headers for CDN and browser caching
    const response = NextResponse.json({
      stats,
      recentCollections,
      recentAssets,
    });

    // Cache for 30 seconds, stale-while-revalidate for 60 seconds
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');

    return response;
  } catch (error: unknown) {
    console.error('❌ Failed to fetch dashboard data:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
