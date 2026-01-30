/**
 * Product Categories API Route
 * GET /api/products/[id]/categories - Get product's categories
 * PUT /api/products/[id]/categories - Replace all categories for product
 * POST /api/products/[id]/categories - Add category to product
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[id]/categories
 * Get all categories for a product
 */
export const GET = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const product = await db.products.getById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!verifyOwnership({ clientId, resourceClientId: product.clientId, resourceType: 'product', resourceId: id })) {
      return forbiddenResponse();
    }

    const links = await db.productCategories.listByProduct(id);

    // Get full category details
    const categoryIds = links.map((l) => l.categoryId);
    const categories = await Promise.all(categoryIds.map((catId) => db.categories.getById(catId)));

    const result = links.map((link) => {
      const category = categories.find((c) => c?.id === link.categoryId);
      return {
        categoryId: link.categoryId,
        categoryName: category?.name || 'Unknown',
        isPrimary: link.isPrimary,
      };
    });

    return NextResponse.json({ categories: result });
  } catch (error) {
    console.error('Failed to get product categories:', error);
    return NextResponse.json({ error: 'Failed to get product categories' }, { status: 500 });
  }
});

/**
 * PUT /api/products/[id]/categories
 * Replace all categories for a product
 * Body: { categoryIds: string[], primaryCategoryId?: string }
 */
export const PUT = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const product = await db.products.getById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!verifyOwnership({ clientId, resourceClientId: product.clientId, resourceType: 'product', resourceId: id })) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { categoryIds, primaryCategoryId } = body;

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json({ error: 'categoryIds must be an array' }, { status: 400 });
    }

    // Verify all categories belong to the client
    for (const catId of categoryIds) {
      const cat = await db.categories.getById(catId);
      if (!cat || cat.clientId !== clientId) {
        return NextResponse.json({ error: `Category ${catId} not found or not owned` }, { status: 400 });
      }
    }

    // Replace categories
    await db.productCategories.replaceProductCategories(id, categoryIds, primaryCategoryId);

    // Return updated categories
    const links = await db.productCategories.listByProduct(id);
    const categories = await Promise.all(links.map((l) => db.categories.getById(l.categoryId)));

    const result = links.map((link) => {
      const category = categories.find((c) => c?.id === link.categoryId);
      return {
        categoryId: link.categoryId,
        categoryName: category?.name || 'Unknown',
        isPrimary: link.isPrimary,
      };
    });

    return NextResponse.json({ categories: result });
  } catch (error) {
    console.error('Failed to update product categories:', error);
    return NextResponse.json({ error: 'Failed to update product categories' }, { status: 500 });
  }
});

/**
 * POST /api/products/[id]/categories
 * Add a category to a product
 * Body: { categoryId: string, isPrimary?: boolean }
 */
export const POST = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const product = await db.products.getById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!verifyOwnership({ clientId, resourceClientId: product.clientId, resourceType: 'product', resourceId: id })) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { categoryId, isPrimary } = body;

    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
    }

    // Verify category belongs to client
    const category = await db.categories.getById(categoryId);
    if (!category || category.clientId !== clientId) {
      return NextResponse.json({ error: 'Category not found or not owned' }, { status: 400 });
    }

    await db.productCategories.link(id, categoryId, isPrimary || false);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to add category to product:', error);
    return NextResponse.json({ error: 'Failed to add category to product' }, { status: 500 });
  }
});
