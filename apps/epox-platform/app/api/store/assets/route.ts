/**
 * Store Assets API
 * GET - Fetch ALL products with their base images and generated assets for the Store page
 *
 * Returns products with:
 * - baseImages: Original product images (with public URLs)
 * - syncedAssets: Generated assets that have been successfully synced to store
 * - unsyncedAssets: Generated assets not yet synced
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';
import { storage } from '@/lib/services/storage';
import { getStoreService } from '@/lib/services/erp';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get store connection
    const storeService = getStoreService();
    const connection = await storeService.getConnection(clientId);

    if (!connection || connection.status !== 'active') {
      return NextResponse.json({ error: 'No active store connection found' }, { status: 404 });
    }

    // Fetch ALL products with their base images and generated assets
    const storeProducts = await db.products.listForStorePage(clientId, connection.id);

    // Transform baseImages to include public URLs
    const transformedProducts = storeProducts.map((productView) => ({
      ...productView,
      baseImages: productView.baseImages.map((img) => ({
        ...img,
        // Add public URL for the image
        url: storage.getPublicUrl(img.imageUrl),
      })),
    }));

    return NextResponse.json({
      products: transformedProducts,
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch store assets:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
