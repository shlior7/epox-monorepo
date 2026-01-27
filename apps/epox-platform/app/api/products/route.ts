/**
 * Products API Route
 * Production-ready with repository facades for filtering, sorting, and pagination
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { storage } from '@/lib/services/storage';
import { withSecurity } from '@/lib/security/middleware';
import type { ProductSource } from 'visualizer-types';

// Revalidate product listings every 15 seconds

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
export const revalidate = 15;

export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters with defaults
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const sceneType = searchParams.get('sceneType') ?? searchParams.get('sceneType') ?? undefined;
    const source = searchParams.get('source') as ProductSource | undefined;
    const analyzedFilter = searchParams.get('analyzed') || undefined;
    const sort = (searchParams.get('sort') || 'updated') as
      | 'name'
      | 'price'
      | 'category'
      | 'created'
      | 'updated';
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // Max 100 per page

    // Validate pagination
    if (page < 1 || limit < 1) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Build filter options
    const filterOptions = {
      search,
      category,
      sceneType,
      source,
      analyzed: analyzedFilter === 'true' ? true : analyzedFilter === 'false' ? false : undefined,
    };

    // Execute count and list queries in parallel
    const [total, products, categories, sceneTypes] = await Promise.all([
      db.products.countWithFilters(clientId, filterOptions),
      db.products.listWithFiltersAndImages(clientId, {
        ...filterOptions,
        sort,
        order,
        limit,
        offset,
      }),
      db.products.getDistinctCategories(clientId),
      db.products.getDistinctSceneTypes(clientId),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Map to frontend format
    const mappedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.storeSku || `SKU-${p.id.slice(0, 8)}`,
      category: p.category || 'Uncategorized',
      description: p.description || '',
      sceneTypes: p.sceneTypes ?? [],
      selectedSceneType: p.selectedSceneType,
      source: p.source,
      analyzed: p.analyzedAt !== null,
      price: p.price ? parseFloat(p.price) : 0,
      isFavorite: p.isFavorite,

      // Return ALL images with proper URLs converted from storage keys
      images: p.images.map((img) => ({
        id: img.id,
        baseUrl: storage.getPublicUrl(img.imageUrl),
        previewUrl: img.previewUrl ? storage.getPublicUrl(img.previewUrl) : null,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),

      // Backward compatibility: primary image URL (or first if none marked)
      imageUrl: (() => {
        const primary = p.images.find((img) => img.isPrimary) ?? p.images[0];
        return primary ? storage.getPublicUrl(primary.imageUrl) : '';
      })(),

      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    const response = NextResponse.json({
      products: mappedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
      filters: {
        categories,
        sceneTypes,
      },
    });

    // Cache product listings for 15 seconds (private per-user)
    response.headers.set('Cache-Control', 'private, s-maxage=15, stale-while-revalidate=30');

    return response;
  } catch (error: any) {
    console.error('❌ Failed to fetch products:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});

export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, sku, category, sceneTypes, price, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be non-empty' },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (name.length > 255) {
      return NextResponse.json({ error: 'Name must be 255 characters or less' }, { status: 400 });
    }

    // Validate sceneTypes array
    if (sceneTypes !== undefined && !Array.isArray(sceneTypes)) {
      return NextResponse.json({ error: 'sceneTypes must be an array' }, { status: 400 });
    }

    // Validate price
    if (price !== undefined && price !== null && (typeof price !== 'number' || price < 0)) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
    }

    // Create product in database
    const product = await db.products.create(clientId, {
      name: name.trim(),
      category: category?.trim() || null,
      sceneTypes: Array.isArray(sceneTypes) ? sceneTypes : undefined,
      storeSku: sku?.trim() || null,
      price: price !== undefined && price !== null ? price.toString() : null,
      description: description?.trim() || null,
      source: 'uploaded',
    });

    // Map to frontend format (no images yet on creation)
    const responseProduct = {
      id: product.id,
      name: product.name,
      sku: product.storeSku || `SKU-${product.id.slice(0, 8)}`,
      category: product.category || 'Uncategorized',
      description: product.description || '',
      sceneTypes: product.sceneTypes ?? [],
      images: [], // No images on creation
      imageUrl: '', // No image URL on creation
      analyzed: false,
      source: product.source,
      price: product.price ? parseFloat(product.price) : 0,
      isFavorite: product.isFavorite,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    console.log('✅ Created product:', product.id);
    return NextResponse.json(responseProduct, { status: 201 });
  } catch (error: any) {
    console.error('❌ Failed to create product:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
