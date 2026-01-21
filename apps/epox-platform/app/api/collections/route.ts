/**
 * Collections API Route
 * Production-ready with repository facades for filtering, sorting, and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';
import type { CollectionSessionStatus, FlowGenerationSettings } from 'visualizer-types';

export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters with defaults
    const search = searchParams.get('search') || undefined;
    const statusFilter = (searchParams.get('status') || 'all') as CollectionSessionStatus | 'all';
    const sort = (searchParams.get('sort') || 'recent') as 'recent' | 'name' | 'productCount';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100); // Max 100 per page

    // Validate pagination
    if (page < 1 || limit < 1) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Build filter options
    const filterOptions = {
      search,
      status: statusFilter,
    };

    // Execute count and list queries in parallel
    const [total, collections] = await Promise.all([
      db.collectionSessions.countWithFilters(clientId, filterOptions),
      db.collectionSessions.listWithFilters(clientId, {
        ...filterOptions,
        sort,
        limit,
        offset,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const collectionIds = collections.map((collection) => collection.id);
    const flows = await db.generationFlows.listByCollectionSessionIds(collectionIds);
    const flowIdsByCollection = new Map<string, string[]>();

    for (const flow of flows) {
      const collectionId = flow.collectionSessionId;
      if (!collectionId) continue;
      const existing = flowIdsByCollection.get(collectionId) ?? [];
      existing.push(flow.id);
      flowIdsByCollection.set(collectionId, existing);
    }

    const assetStatsByCollection = new Map<
      string,
      { totalImages: number; generatedCount: number; thumbnailUrl: string }
    >();

    await Promise.all(
      collectionIds.map(async (collectionId) => {
        const flowIds = flowIdsByCollection.get(collectionId) ?? [];
        const [totalImages, generatedCount, firstAsset] = await Promise.all([
          db.generatedAssets.countByGenerationFlowIds(clientId, flowIds),
          db.generatedAssets.countByGenerationFlowIds(clientId, flowIds, 'completed'),
          db.generatedAssets.getFirstByGenerationFlowIds(clientId, flowIds, 'completed'),
        ]);

        assetStatsByCollection.set(collectionId, {
          totalImages,
          generatedCount,
          thumbnailUrl: firstAsset?.assetUrl ?? '',
        });
      })
    );

    // Map collections to frontend format
    const mappedCollections = collections.map((c) => {
      const productIds = c.productIds as string[];
      const assetStats = assetStatsByCollection.get(c.id) ?? {
        totalImages: 0,
        generatedCount: 0,
        thumbnailUrl: '',
      };
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        productCount: productIds.length,
        productIds,
        generatedCount: assetStats.generatedCount,
        totalImages: assetStats.totalImages,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        thumbnailUrl: assetStats.thumbnailUrl,
      };
    });

    return NextResponse.json({
      collections: mappedCollections,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (error: unknown) {
    console.error('❌ Failed to fetch collections:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { name, productIds, inspirationImages, promptTags } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json({ error: 'Name must be 255 characters or less' }, { status: 400 });
    }

    // Validate productIds
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds must be a non-empty array' }, { status: 400 });
    }

    if (!productIds.every((id) => typeof id === 'string')) {
      return NextResponse.json({ error: 'All productIds must be strings' }, { status: 400 });
    }

    // Validate inspirationImages if provided
    if (inspirationImages !== undefined && typeof inspirationImages !== 'object') {
      return NextResponse.json({ error: 'inspirationImages must be an object' }, { status: 400 });
    }

    // Convert wizard inspiration images format to settings format
    const inspirationImagesArray = inspirationImages
      ? Object.values(inspirationImages).map((url: any) => ({
          url,
          thumbnailUrl: url,
          tags: [],
          addedAt: new Date().toISOString(),
          sourceType: 'upload' as const,
        }))
      : [];

    // Build collection settings
    const collectionSettings: FlowGenerationSettings | undefined =
      inspirationImagesArray.length > 0
        ? {
            inspirationImages: inspirationImagesArray,
            aspectRatio: '1:1',
            imageQuality: '2k' as import('visualizer-types').ImageQuality,
            variantsCount: 1,
          }
        : undefined;

    // Create collection in database
    const collection = await db.collectionSessions.create(clientId, {
      name: name.trim(),
      productIds,
      status: 'draft',
      selectedBaseImages: inspirationImages || {},
      settings: collectionSettings,
    });

    // Create dedicated generation flows for each product in the collection
    const createdFlows = [];
    for (const productId of productIds) {
      try {
        const flow = await db.generationFlows.create(clientId, {
          collectionSessionId: collection.id,
          name: `${name.trim()} - ${productId}`,
          productIds: [productId],
          selectedBaseImages: {},
          settings: collectionSettings || {
            aspectRatio: '1:1',
            imageQuality: '2k' as import('visualizer-types').ImageQuality,
            variantsCount: 1,
          },
        });
        createdFlows.push(flow);
        console.log(
          `✅ Created generation flow ${flow.id} for product ${productId} in collection ${collection.id}`
        );
      } catch (error) {
        console.error(`❌ Failed to create flow for product ${productId}:`, error);
      }
    }

    console.log(
      `✅ Created collection ${collection.id} with ${createdFlows.length} generation flows`
    );

    // Map to frontend format
    const responseCollection = {
      id: collection.id,
      name: collection.name,
      status: collection.status,
      productCount: collection.productIds.length,
      generatedCount: 0,
      totalImages: 0, // Start with 0, will be updated as assets are generated
      productIds: collection.productIds,
      inspirationImages: inspirationImages || [],
      promptTags: promptTags || {},
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };

    console.log('✅ Created collection:', collection.id);
    return NextResponse.json(responseCollection, { status: 201 });
  } catch (error: unknown) {
    console.error('❌ Failed to create collection:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
