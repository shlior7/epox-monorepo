/**
 * API Route: Fetch product categories from WooCommerce provider
 * Uses erp-service to retrieve credentials and fetch categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStoreService, type ProviderCategory } from '@scenergy/erp-service';
import { db } from 'visualizer-db';

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface FetchCategoriesResponse {
  success: boolean;
  categories?: WooCommerceCategory[];
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<FetchCategoriesResponse>> {
  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Missing clientId parameter' }, { status: 400 });
    }

    console.log('🏷️ Fetching WooCommerce categories for client:', clientId);

    // Use store service to fetch categories (handles credentials securely using clientId)
    const storeService = createStoreService(db);
    const providerCategories = await storeService.getCategories(clientId);

    const categories: WooCommerceCategory[] = providerCategories.map((cat: ProviderCategory) => ({
      id: typeof cat.id === 'string' ? parseInt(cat.id, 10) : cat.id,
      name: cat.name,
      slug: cat.slug,
      count: cat.count || 0,
    }));

    console.log(`✅ Fetched ${categories.length} categories from WooCommerce`);

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('❌ Failed to fetch WooCommerce categories:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
