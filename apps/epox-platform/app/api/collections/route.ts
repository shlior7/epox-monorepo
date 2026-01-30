/**
 * Collections API Route
 * Production-ready with repository facades for filtering, sorting, and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';
import { resolveStorageUrl } from 'visualizer-storage';
import type { CollectionSessionStatus, FlowGenerationSettings, InspirationSection } from 'visualizer-types';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
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

    // Execute count and optimized list with asset stats in parallel (N+1 elimination)
    const [total, collectionsWithStats] = await Promise.all([
      db.collectionSessions.countWithFilters(clientId, filterOptions),
      db.collectionSessions.listWithAssetStats(clientId, {
        ...filterOptions,
        sort,
        limit,
        offset,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Map collections to frontend format - stats already included
    const mappedCollections = collectionsWithStats.map((c) => {
      const productIds = c.productIds as string[];

      // Compute effective status based on actual asset state
      let effectiveStatus: CollectionSessionStatus = c.status;
      if (c.generatingCount > 0) {
        effectiveStatus = 'generating';
      } else if (c.totalImages > 0 && c.completedCount === c.totalImages) {
        effectiveStatus = 'completed';
      } else if (c.totalImages === 0 && c.status === 'generating') {
        // No assets but marked as generating - reset to draft
        effectiveStatus = 'draft';
      }

      // Resolve thumbnail URLs (may be relative storage keys or full URLs)
      const thumbnails = (c.thumbnails ?? [])
        .map((url) => resolveStorageUrl(url))
        .filter((url): url is string => url !== null);

      return {
        id: c.id,
        name: c.name,
        status: effectiveStatus,
        productCount: productIds.length,
        productIds,
        generatedCount: c.completedCount,
        totalImages: c.totalImages,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        thumbnails,
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
    const { name, productIds, inspirationImages, promptTags, settings: incomingSettings } = body;

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

    // Convert wizard inspiration images to reference bubbles
    const generalInspiration: import('visualizer-types').BubbleValue[] = inspirationImages
      ? Object.values(inspirationImages).map((url: any) => ({
          type: 'reference' as const,
          image: {
            url,
            addedAt: new Date().toISOString(),
            sourceType: 'upload' as const,
          },
        }))
      : [];

    // Build collection settings
    const collectionSettings: import('visualizer-types').CollectionGenerationSettings | undefined =
      generalInspiration.length > 0
        ? {
            generalInspiration,
            inspirationSections: [],
            aspectRatio: '1:1',
            imageQuality: '2k' as import('visualizer-types').ImageQuality,
            variantsPerProduct: 1,
          }
        : undefined;

    // Fetch products to get their selected scene types
    // selectedSceneType is set when user changes scene type on product cards in Studio Home
    // This ensures flows inherit the user's scene type selection for each product
    const products = await db.products.listByIds(productIds);
    const productSceneTypeMap = new Map<string, string>();
    products.forEach((product) => {
      if (product.selectedSceneType) {
        productSceneTypeMap.set(product.id, product.selectedSceneType);
      }
    });

    // Auto-populate inspirationSections from category defaults
    // For each product, find its categories and check for generationSettings.defaultBubbles
    const autoSections: InspirationSection[] = [];
    const processedCategoryIds = new Set<string>();

    try {
      // Batch: get all product-category links for all products
      const categoryLinksPerProduct = await Promise.all(
        productIds.map((pid) => db.productCategories.listByProduct(pid))
      );

      // Collect unique category IDs
      const uniqueCategoryIds = new Set<string>();
      for (const links of categoryLinksPerProduct) {
        for (const link of links) {
          uniqueCategoryIds.add(link.categoryId);
        }
      }

      // Fetch categories with generation settings
      if (uniqueCategoryIds.size > 0) {
        const categoryFetches = await Promise.all(
          Array.from(uniqueCategoryIds).map((catId) => db.categories.getById(catId))
        );

        for (const category of categoryFetches) {
          if (
            category &&
            category.generationSettings?.defaultBubbles &&
            category.generationSettings.defaultBubbles.length > 0 &&
            !processedCategoryIds.has(category.id)
          ) {
            processedCategoryIds.add(category.id);
            autoSections.push({
              id: crypto.randomUUID(),
              categoryIds: [category.id],
              sceneTypes: [],
              bubbles: category.generationSettings.defaultBubbles,
              enabled: true,
            });
            console.log(
              `✅ Auto-populated section for category "${category.name}" with ${category.generationSettings.defaultBubbles.length} generation settings`
            );
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to auto-populate category sections:', error);
    }

    // Merge auto-populated sections into collection settings
    // Priority: incomingSettings (from config panel) > collectionSettings (from wizard) > autoSections
    let finalSettings: import('visualizer-types').CollectionGenerationSettings | undefined;

    if (incomingSettings) {
      // Config panel settings provided — use as base, merge auto sections that don't overlap
      const existingSectionCategoryIds = new Set<string>();
      (incomingSettings.inspirationSections || []).forEach((s: InspirationSection) => {
        s.categoryIds?.forEach((cid: string) => existingSectionCategoryIds.add(cid));
      });
      const newAutoSections = autoSections.filter(
        (s) => !s.categoryIds?.some((cid) => existingSectionCategoryIds.has(cid))
      );

      finalSettings = {
        generalInspiration: incomingSettings.generalInspiration || [],
        inspirationSections: [...(incomingSettings.inspirationSections || []), ...newAutoSections],
        userPrompt: incomingSettings.userPrompt || '',
        aspectRatio: incomingSettings.aspectRatio || '1:1',
        imageQuality: (incomingSettings.imageQuality || '2k') as import('visualizer-types').ImageQuality,
        variantsPerProduct: incomingSettings.variantsPerProduct || 1,
      };
    } else if (collectionSettings) {
      finalSettings = {
        ...collectionSettings,
        inspirationSections: [...collectionSettings.inspirationSections, ...autoSections],
      };
    } else if (autoSections.length > 0) {
      finalSettings = {
        generalInspiration: [],
        inspirationSections: autoSections,
        aspectRatio: '1:1',
        imageQuality: '2k' as import('visualizer-types').ImageQuality,
        variantsPerProduct: 1,
      };
    }

    // Create collection in database
    const collection = await db.collectionSessions.create(clientId, {
      name: name.trim(),
      productIds,
      status: 'draft',
      selectedBaseImages: inspirationImages || {},
      settings: finalSettings || undefined,
    });

    // Create dedicated generation flows for each product in the collection
    const createdFlows: Awaited<ReturnType<typeof db.generationFlows.create>>[] = [];
    for (const productId of productIds) {
      try {
        // Get the product's selected scene type
        const selectedSceneType = productSceneTypeMap.get(productId);

        // Merge collection settings with product-specific scene type
        const flowSettings = {
          ...(finalSettings || {
            aspectRatio: '1:1' as const,
            imageQuality: '2k' as import('visualizer-types').ImageQuality,
            variantsPerProduct: 1,
          }),
          ...(selectedSceneType && { sceneType: selectedSceneType }),
        };

        const flow = await db.generationFlows.create(clientId, {
          collectionSessionId: collection.id,
          name: `${name.trim()} - ${productId}`,
          productIds: [productId],
          selectedBaseImages: {},
          settings: flowSettings,
        });
        createdFlows.push(flow);
        console.log(
          `✅ Created generation flow ${flow.id} for product ${productId} in collection ${collection.id}${selectedSceneType ? ` with scene type: ${selectedSceneType}` : ''}`
        );
      } catch (error) {
        console.error(`❌ Failed to create flow for product ${productId}:`, error);
      }
    }

    console.log(
      `✅ Created collection ${collection.id} with ${createdFlows.length} generation flows`
    );

    // Get thumbnails from product base images (up to 4)
    const thumbnails: string[] = [];

    for (const productId of productIds.slice(0, 4)) {
      try {
        const productImages = await db.productImages.list(productId);
        const primaryImage = productImages.find((img) => img.isPrimary);

        // Resolve storage key to public URL
        const imageUrl = primaryImage?.imageUrl || productImages[0]?.imageUrl;
        if (imageUrl) {
          const fullUrl = resolveStorageUrl(imageUrl);
          if (fullUrl) {
            thumbnails.push(fullUrl);
          }
        }
      } catch (error) {
        console.warn(`Failed to get image for product ${productId}:`, error);
      }
    }

    // Map to frontend format with thumbnails
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
      thumbnails,
    };

    console.log('✅ Created collection:', collection.id, 'with', thumbnails.length, 'thumbnails');
    return NextResponse.json(responseCollection, { status: 201 });
  } catch (error: unknown) {
    console.error('❌ Failed to create collection:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
