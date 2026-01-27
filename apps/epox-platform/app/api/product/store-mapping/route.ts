/**
 * Product Store Mapping API
 * POST - Map a product to a store product
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, storeId, storeUrl, storeName } = body;

    // Validate request
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    if (!storeId || (typeof storeId !== 'string' && typeof storeId !== 'number')) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // Verify product exists and belongs to client
    const product = await db.products.getById(productId);
    if (!product || product.clientId !== clientId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update product with store mapping
    const updatedProduct = await db.products.update(productId, {
      storeId: String(storeId),
      storeUrl: storeUrl || null,
      storeName: storeName || null,
    });

    return NextResponse.json({
      success: true,
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        storeId: updatedProduct.storeId,
        storeUrl: updatedProduct.storeUrl,
        storeName: updatedProduct.storeName,
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to update product store mapping:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
