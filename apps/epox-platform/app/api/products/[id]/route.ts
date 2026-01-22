/**
 * Product Detail API Route
 * Production-ready with repository facades
 */

import { db } from '@/lib/services/db';
import { storage } from '@/lib/services/storage';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security/middleware';
import { verifyOwnership, forbiddenResponse } from '@/lib/security/auth';


// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
export const GET = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeAssets = searchParams.get('includeAssets') !== 'false';

    // Fetch product with images
    const product = await db.products.getWithImages(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Map to frontend format with ALL images and proper URLs
    const mappedProduct = {
      id: product.id,
      name: product.name,
      sku: product.erpSku ?? `SKU-${product.id.slice(0, 8)}`,
      category: product.category ?? 'Uncategorized',
      description: product.description ?? '',
      sceneTypes: product.sceneTypes ?? [],
      source: product.source,
      analyzed: product.analyzedAt != null,
      price: product.price ? parseFloat(product.price) : 0,
      isFavorite: product.isFavorite,

      // Return ALL images with proper URLs from storage keys
      baseImages: product.images.map((img) => ({
        id: img.id,
        url: storage.getPublicUrl(img.r2KeyBase),
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })),

      analysis: product.analysisData ?? {
        productType: '',
        materials: [],
        colors: [],
        style: [],
        dominantColorHex: '#CCCCCC',
      },

      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    const response: typeof mappedProduct & {
      generatedAssets?: any[];
      collections?: any[];
      stats?: {
        totalGenerated: number;
        pinnedCount: number;
        approvedCount: number;
        pendingCount: number;
      };
    } = mappedProduct;

    if (includeAssets) {
      // Query assets and stats in parallel - stats use optimized SQL aggregation
      const [productAssets, stats] = await Promise.all([
        db.generatedAssets.listByProductId(clientId, id, 100),
        db.generatedAssets.getStatsByProductId(clientId, id),
      ]);

      response.generatedAssets = productAssets.map((asset) => ({
        id: asset.id,
        url: asset.assetUrl,
        sceneType: '', // TODO: Extract from settings if needed
        rating: 0, // TODO: Add rating field to schema
        isPinned: asset.pinned,
        approvalStatus: asset.approvalStatus,
        createdAt: asset.createdAt.toISOString(),
      }));

      response.stats = stats;
    }

    // Query collections that contain this product
    const productCollections = await db.collectionSessions.listByProductId(clientId, id, 20);

    response.collections = productCollections.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      productCount: c.productIds.length,
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('❌ Failed to fetch product:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const PATCH = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch product first to verify existence
    const product = await db.products.getById(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify ownership
    if (
      !verifyOwnership({
        clientId,
        resourceClientId: product.clientId,
        resourceType: 'product',
        resourceId: id,
      })
    ) {
      return forbiddenResponse();
    }

    // Validate inputs if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 });
      }
      if (body.name.length > 255) {
        return NextResponse.json({ error: 'Name must be 255 characters or less' }, { status: 400 });
      }
    }

    if (body.sceneTypes !== undefined && !Array.isArray(body.sceneTypes)) {
      return NextResponse.json({ error: 'sceneTypes must be an array' }, { status: 400 });
    }

    if (
      body.price !== undefined &&
      body.price != null &&
      typeof body.price !== 'number' &&
      body.price < 0
    ) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
    }

    // Update product with only provided fields
    const updateData: any = {};
    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() ?? null;
    }
    if (body.category !== undefined) {
      updateData.category = body.category?.trim() ?? null;
    }
    if (body.sceneTypes !== undefined) {
      updateData.sceneTypes = body.sceneTypes;
    }
    if (body.price !== undefined) {
      updateData.price = body.price != null ? body.price.toString() : null;
    }

    const updated = await db.products.update(id, updateData);

    // Map to frontend format
    const response = {
      id: updated.id,
      name: updated.name,
      sku: updated.erpSku ?? `SKU-${updated.id.slice(0, 8)}`,
      category: updated.category ?? 'Uncategorized',
      description: updated.description ?? '',
      sceneTypes: updated.sceneTypes ?? [],
      source: updated.source,
      analyzed: updated.analyzedAt != null,
      price: updated.price ? parseFloat(updated.price) : 0,
      isFavorite: updated.isFavorite,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    console.log('✅ Updated product:', id);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('❌ Failed to update product:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;

    // Fetch product first
    const product = await db.products.getById(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify ownership
    if (
      !verifyOwnership({
        clientId,
        resourceClientId: product.clientId,
        resourceType: 'product',
        resourceId: id,
      })
    ) {
      return forbiddenResponse();
    }

    // Delete product (soft delete)
    await db.products.delete(id);

    console.log('✅ Deleted product:', id);
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error('❌ Failed to delete product:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
