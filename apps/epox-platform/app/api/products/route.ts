/**
 * Products API Route
 * Production-ready with repository facades for filtering, sorting, and pagination
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { storage } from '@/lib/services/storage';
import type { ProductSource } from 'visualizer-types';

// TODO: Replace with actual auth when implemented
const PLACEHOLDER_CLIENT_ID = 'test-client';

export async function GET(request: NextRequest) {
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
      db.products.countWithFilters(PLACEHOLDER_CLIENT_ID, filterOptions),
      db.products.listWithFiltersAndImages(PLACEHOLDER_CLIENT_ID, {
        ...filterOptions,
        sort,
        order,
        limit,
        offset,
      }),
      db.products.getDistinctCategories(PLACEHOLDER_CLIENT_ID),
      db.products.getDistinctSceneTypes(PLACEHOLDER_CLIENT_ID),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Map to frontend format
    const mappedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.erpSku || `SKU-${p.id.slice(0, 8)}`,
      category: p.category || 'Uncategorized',
      description: p.description || '',
      sceneTypes: p.sceneTypes ?? [],
      source: p.source,
      analyzed: p.analyzedAt !== null,
      price: p.price ? parseFloat(p.price) : 0,
      isFavorite: p.isFavorite,

      // Return ALL images with proper URLs converted from storage keys
      images: p.images.map((img) => ({
        id: img.id,
        baseUrl: storage.getPublicUrl(img.r2KeyBase),
        previewUrl: img.r2KeyPreview ? storage.getPublicUrl(img.r2KeyPreview) : null,
        sortOrder: img.sortOrder,
      })),

      // Backward compatibility: first image URL
      imageUrl: p.images[0] ? storage.getPublicUrl(p.images[0].r2KeyBase) : '',

      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({
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
  } catch (error: any) {
    console.error('❌ Failed to fetch products:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const product = await db.products.create(PLACEHOLDER_CLIENT_ID, {
      name: name.trim(),
      category: category?.trim() || null,
      sceneTypes: Array.isArray(sceneTypes) ? sceneTypes : undefined,
      erpSku: sku?.trim() || null,
      price: price !== undefined && price !== null ? price.toString() : null,
      description: description?.trim() || null,
      source: 'uploaded',
    });

    // Map to frontend format (no images yet on creation)
    const responseProduct = {
      id: product.id,
      name: product.name,
      sku: product.erpSku || `SKU-${product.id.slice(0, 8)}`,
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
}
