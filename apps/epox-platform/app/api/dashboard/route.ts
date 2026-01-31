/**
 * Dashboard API Route
 * Optimized with single-query aggregation and caching
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';
import { resolveStorageUrl } from 'visualizer-storage';
import { createQuotaServiceFromDb } from 'visualizer-client';

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
    const quotaService = createQuotaServiceFromDb(db);

    // Execute all count queries and optimized collection list in parallel
    const [
      productCount,
      collectionCount,
      completedAssetsCount,
      recentCollectionsWithStats,
      recentGeneratedAssets,
      recentProductsWithImages,
      quotaStatus,
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
      db.products.listWithImages(clientId),
      quotaService.getQuotaStatus(clientId),
    ]);

    const stats = {
      totalProducts: productCount,
      totalCollections: collectionCount,
      totalGenerated: completedAssetsCount,
      creditsRemaining: quotaStatus.usage.generationsRemaining,
      creditsTotal: quotaStatus.usage.generationsLimit,
      plan: quotaStatus.plan,
      usagePercent: quotaStatus.usage.usagePercent,
      resetDate: quotaStatus.resetDate.toISOString(),
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

    // Look up generation flows to get collectionSessionId for asset routing
    const flowIds = [
      ...new Set(
        recentGeneratedAssets
          .map((a) => a.generationFlowId)
          .filter((id): id is string => id !== null)
      ),
    ];
    const flowsMap = new Map<string, { collectionSessionId: string | null }>();
    if (flowIds.length > 0) {
      const flows = await Promise.all(flowIds.map((id) => db.generationFlows.getById(id)));
      for (const flow of flows) {
        if (flow) {
          flowsMap.set(flow.id, { collectionSessionId: flow.collectionSessionId });
        }
      }
    }

    const recentAssets = recentGeneratedAssets.map((a) => {
      const productId = a.productIds?.[0] ?? '';
      const product = productsMap.get(productId);
      const sceneTypes = (a.settings as { promptTags?: { sceneType?: string[] } } | null)
        ?.promptTags?.sceneType;
      const flow = a.generationFlowId ? flowsMap.get(a.generationFlowId) : null;

      return {
        id: a.id,
        imageUrl: a.assetUrl,
        productId,
        productName: product?.name ?? 'Unknown Product',
        productCategory: product?.category ?? undefined,
        sceneType: sceneTypes?.[0] ?? undefined,
        flowId: a.generationFlowId ?? undefined,
        collectionId: flow?.collectionSessionId ?? undefined,
        createdAt: a.createdAt.toISOString(),
      };
    });

    // Map recent products (limit 6, most recent first)
    const recentProducts = recentProductsWithImages
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6)
      .map((p) => {
        const primary = p.images.find((img) => img.isPrimary) ?? p.images[0];
        const imageUrl = primary
          ? resolveStorageUrl(primary.previewUrl ?? primary.imageUrl)
          : null;
        return {
          id: p.id,
          name: p.name,
          category: p.category ?? undefined,
          imageUrl: imageUrl ?? undefined,
          createdAt: p.createdAt.toISOString(),
        };
      });

    // Add cache headers for CDN and browser caching
    const response = NextResponse.json({
      stats,
      recentCollections,
      recentAssets,
      recentProducts,
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
