/**
 * Categories API Route
 * GET /api/categories - List all categories for the client
 * POST /api/categories - Create a new category
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/categories
 * List all categories for the authenticated client
 */
export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const parentId = searchParams.get('parentId');

    const categories = await db.categories.listByClient(clientId, {
      search,
      parentId: parentId === 'null' ? null : parentId || undefined,
    });

    // Get product counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const products = await db.productCategories.listByCategory(cat.id);
        return {
          ...cat,
          productCount: products.length,
        };
      })
    );

    return NextResponse.json({
      categories: categoriesWithCounts,
      total: categoriesWithCounts.length,
    });
  } catch (error) {
    console.error('Failed to list categories:', error);
    return NextResponse.json({ error: 'Failed to list categories' }, { status: 500 });
  }
});

/**
 * POST /api/categories
 * Create a new category
 */
export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, slug, description, parentId, sortOrder } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const category = await db.categories.create({
      clientId,
      name: name.trim(),
      slug: slug?.trim(),
      description: description?.trim(),
      parentId: parentId || null,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
});
