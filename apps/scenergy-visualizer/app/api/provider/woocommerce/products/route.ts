/**
 * API Route: Fetch products from WooCommerce provider
 * Uses erp-service to retrieve credentials and fetch products
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStoreService, type ProviderProduct } from '@scenergy/erp-service';
import { db } from 'visualizer-db';

// Simplified product response for the import modal
export interface WooCommerceProductPreview {
  id: number;
  name: string;
  description: string;
  shortDescription: string;
  images: Array<{
    id: number | string;
    src: string;
    name?: string;
    alt?: string;
  }>;
  categories: Array<{
    id: number | string;
    name: string;
    slug: string;
  }>;
  status: string;
  type?: string;
  sku?: string;
}

export interface FetchProductsRequest {
  clientId: string;
  // Filter options
  limit?: number; // Max products to fetch (default 10)
  productIds?: number[]; // Specific product IDs to fetch
  category?: string; // Category slug to filter by
  status?: 'publish' | 'draft' | 'pending' | 'private'; // Product status filter
  search?: string; // Search term
}

export interface FetchProductsResponse {
  success: boolean;
  products?: WooCommerceProductPreview[];
  total?: number;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<FetchProductsResponse>> {
  try {
    const body: FetchProductsRequest = await request.json();
    const { clientId, limit = 10, productIds, category, status = 'publish', search } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Missing clientId parameter' }, { status: 400 });
    }

    console.log('🛒 Fetching WooCommerce products for client:', clientId);

    // Use store service to fetch products (handles credentials securely using clientId)
    const storeService = createStoreService(db);

    // Fetch products using clientId to retrieve credentials
    const result = await storeService.getProducts(clientId, {
      limit,
      ids: productIds,
      category,
      search,
    });

    console.log(`✅ Fetched ${result.items.length} products from WooCommerce`);

    // Transform to preview format
    const previews: WooCommerceProductPreview[] = result.items.map((product: ProviderProduct) => ({
      id: typeof product.id === 'string' ? parseInt(product.id, 10) : product.id,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription || '',
      images: product.images.map((img) => ({
        id: img.id,
        src: img.src,
        alt: img.alt,
      })),
      categories: product.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      })),
      status: product.status,
      type: product.type,
      sku: product.sku,
    }));

    return NextResponse.json({
      success: true,
      products: previews,
      total: result.total,
    });
  } catch (error) {
    console.error('❌ Failed to fetch WooCommerce products:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
