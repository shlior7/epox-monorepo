/**
 * Sync Asset to Store API
 * POST - Sync a single asset to the connected store
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';
import { getStoreService } from '@/lib/services/erp';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assetId } = body;

    // Validate request
    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
    }

    // Get asset
    const asset = await db.generatedAssets.getById(assetId);
    if (!asset || asset.clientId !== clientId) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get first product ID from asset
    const productId = asset.productIds?.[0];
    if (!productId) {
      return NextResponse.json({ error: 'Asset has no associated product' }, { status: 400 });
    }

    // Get product with store mapping
    const product = await db.products.getById(productId);
    if (!product || product.clientId !== clientId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!product.storeId) {
      return NextResponse.json(
        { error: 'Product must be mapped to a store product before syncing' },
        { status: 400 }
      );
    }

    // Get store connection
    const storeService = getStoreService();
    const connection = await storeService.getConnection(clientId);

    if (!connection || connection.status !== 'active') {
      return NextResponse.json({ error: 'No active store connection found' }, { status: 404 });
    }

    // Create sync log entry with pending status
    const syncLog = await db.storeSyncLogs.create({
      storeConnectionId: connection.id,
      generatedAssetId: assetId,
      productId,
      action: 'upload',
    });

    try {
      // Sync to store (upload image)
      const uploadedImages = await storeService.updateProductImages(clientId, product.storeId, [
        asset.assetUrl,
      ]);

      // Update sync log with success
      const updatedLog = await db.storeSyncLogs.updateStatus(syncLog.id, 'success', {
        externalImageUrl: uploadedImages[0]?.src,
      });

      return NextResponse.json({
        success: true,
        syncId: updatedLog.id,
        externalImageId: uploadedImages[0]?.id?.toString(),
      });
    } catch (syncError: any) {
      // Update sync log with failure
      await db.storeSyncLogs.updateStatus(syncLog.id, 'failed', {
        errorMessage: syncError.message || 'Unknown error',
      });

      console.error('❌ Store sync failed:', syncError);
      return NextResponse.json({ error: 'Failed to sync asset to store' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Failed to sync asset:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
