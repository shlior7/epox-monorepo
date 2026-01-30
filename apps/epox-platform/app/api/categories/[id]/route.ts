/**
 * Single Category API Route
 * GET /api/categories/[id] - Get category details
 * PUT /api/categories/[id] - Update category
 * DELETE /api/categories/[id] - Delete category
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/categories/[id]
 * Get a single category with its products
 */
export const GET = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const category = await db.categories.getById(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Verify ownership
    if (!verifyOwnership({ clientId, resourceClientId: category.clientId, resourceType: 'category', resourceId: id })) {
      return forbiddenResponse();
    }

    // Get products in this category
    const productLinks = await db.productCategories.listByCategory(id);
    const productIds = productLinks.map((p) => p.productId);

    return NextResponse.json({
      category,
      productCount: productIds.length,
      productIds,
    });
  } catch (error) {
    console.error('Failed to get category:', error);
    return NextResponse.json({ error: 'Failed to get category' }, { status: 500 });
  }
});

/**
 * PUT /api/categories/[id]
 * Update category name, description, or settings
 */
export const PUT = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existingCategory = await db.categories.getById(id);
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Verify ownership
    if (
      !verifyOwnership({ clientId, resourceClientId: existingCategory.clientId, resourceType: 'category', resourceId: id })
    ) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { name, slug, description, parentId, sortOrder, generationSettings } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined) updateData.slug = slug.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (generationSettings !== undefined) updateData.generationSettings = generationSettings;

    const category = await db.categories.update(id, updateData);

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Failed to update category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
});

/**
 * DELETE /api/categories/[id]
 * Delete a category (products are unlinked, not deleted)
 */
export const DELETE = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existingCategory = await db.categories.getById(id);
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Verify ownership
    if (
      !verifyOwnership({ clientId, resourceClientId: existingCategory.clientId, resourceType: 'category', resourceId: id })
    ) {
      return forbiddenResponse();
    }

    // Delete category (cascades to product_category links)
    await db.categories.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
});
