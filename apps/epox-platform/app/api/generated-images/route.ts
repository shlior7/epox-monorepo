/**
 * Generated Images API Route
 * Production-ready with repository facades for filtering, sorting, and pagination
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { storage } from 'visualizer-storage';
import type { AssetStatus, ApprovalStatus } from 'visualizer-types';

// TODO: Replace with actual auth when implemented
const PLACEHOLDER_CLIENT_ID = 'test-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters with defaults
    const flowId = searchParams.get('flowId') ?? undefined;
    const productId = searchParams.get('productId') ?? undefined;
    const pinnedFilter = searchParams.get('pinned') ?? undefined;
    const statusFilter = searchParams.get('status') ?? undefined;
    const approvalFilter = searchParams.get('approval') ?? undefined;
    const sort = (searchParams.get('sort') ?? 'date') as 'date' | 'oldest';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100); // Max 100 per page

    // Validate pagination
    if (page < 1 || limit < 1) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // If flowId is provided, fetch assets directly by flow
    if (flowId) {
      const assets = await db.generatedAssets.listByGenerationFlow(flowId, false);

      // Apply additional filters
      let filteredAssets = assets;
      if (statusFilter) {
        filteredAssets = filteredAssets.filter((a) => a.status === statusFilter);
      }
      if (approvalFilter) {
        filteredAssets = filteredAssets.filter((a) => a.approvalStatus === approvalFilter);
      }
      if (pinnedFilter !== undefined) {
        const isPinned = pinnedFilter === 'true';
        filteredAssets = filteredAssets.filter((a) => a.pinned === isPinned);
      }

      // Sort
      if (sort === 'oldest') {
        filteredAssets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      } else {
        filteredAssets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      // Paginate
      const total = filteredAssets.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedAssets = filteredAssets.slice(offset, offset + limit);

      // Get product names
      const productIdsSet = new Set<string>();
      for (const asset of paginatedAssets) {
        if (asset.productIds) {
          for (const id of asset.productIds) {
            productIdsSet.add(id);
          }
        }
      }

      const productMap =
        productIdsSet.size > 0
          ? await db.products.getNamesByIds(Array.from(productIdsSet))
          : new Map<string, string>();

      // Map to frontend format
      const mappedAssets = paginatedAssets.map((asset) => ({
        id: asset.id,
        url: asset.assetUrl,
        assetType: asset.assetType,
        productId: asset.productIds?.[0] ?? '',
        productName: asset.productIds?.[0]
          ? (productMap.get(asset.productIds[0]) ?? 'Unknown Product')
          : 'Unknown Product',
        status: asset.status,
        approvalStatus: asset.approvalStatus,
        createdAt: asset.createdAt.toISOString(),
        pinned: asset.pinned,
      }));

      return NextResponse.json({
        images: mappedAssets,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      });
    }

    // Build filter options for regular query
    const filterOptions = {
      flowId,
      productId,
      pinned: pinnedFilter === 'true' ? true : pinnedFilter === 'false' ? false : undefined,
      status: statusFilter as AssetStatus | undefined,
      approvalStatus: approvalFilter as ApprovalStatus | undefined,
    };

    // Execute count, list, and distinct scene types queries in parallel
    const [total, assets, sceneTypes] = await Promise.all([
      db.generatedAssets.countWithFilters(PLACEHOLDER_CLIENT_ID, filterOptions),
      db.generatedAssets.listWithFilters(PLACEHOLDER_CLIENT_ID, {
        ...filterOptions,
        sort,
        limit,
        offset,
      }),
      db.generatedAssets.getDistinctSceneTypes(PLACEHOLDER_CLIENT_ID, {
        flowId: filterOptions.flowId,
        productId: filterOptions.productId,
        status: filterOptions.status,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Get product names for the assets (batch query)
    const productIdsSet = new Set<string>();
    for (const asset of assets) {
      const ids = asset.productIds;
      if (ids) {
        for (const id of ids) {
          productIdsSet.add(id);
        }
      }
    }

    // Fetch products in a single query
    const productMap =
      productIdsSet.size > 0
        ? await db.products.getNamesByIds(Array.from(productIdsSet))
        : new Map<string, string>();

    // Map to frontend format
    const mappedAssets = assets.map((asset) => {
      const sceneType =
        (asset.settings as { promptTags?: { sceneType?: string[] } } | undefined)?.promptTags
          ?.sceneType?.[0] ?? '';

      return {
        id: asset.id,
        url: asset.assetUrl,
        assetType: asset.assetType,
        productId: asset.productIds?.[0] ?? '',
        productName: asset.productIds?.[0]
          ? (productMap.get(asset.productIds[0]) ?? 'Unknown')
          : 'Unknown',
        flowId: asset.generationFlowId ?? '',
        sceneType,
        rating: 0, // TODO: Add rating field to schema
        isPinned: asset.pinned,
        approvalStatus: asset.approvalStatus,
        status: asset.status,
        createdAt: asset.createdAt.toISOString(),
        settings: asset.settings
          ? {
              aspectRatio: asset.settings.aspectRatio,
              imageQuality: asset.settings.imageQuality,
            }
          : undefined,
      };
    });

    return NextResponse.json({
      images: mappedAssets,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
      filters: {
        sceneTypes,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Failed to fetch generated images:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/generated-images
 * Delete a generated image (revision)
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    // First get the asset to verify ownership and get storage path info
    const asset = await db.generatedAssets.getById(id);

    if (asset?.clientId !== PLACEHOLDER_CLIENT_ID) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete the database record (includes product links)
    await db.generatedAssets.hardDelete(id);

    // Try to delete from storage (don't fail if storage delete fails)
    if (asset.assetUrl) {
      try {
        // Extract the storage key from the URL
        const url = new URL(asset.assetUrl);
        const key = url.pathname.replace(/^\//, '');
        await storage.delete(key);
        console.log(`🗑️ Deleted from storage: ${key}`);
      } catch (storageError) {
        console.warn(`⚠️ Failed to delete from storage:`, storageError);
        // Don't fail the request - DB record is deleted
      }
    }

    console.log(`🗑️ Deleted generated asset: ${id}`);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    console.error('❌ Failed to delete generated image:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
