/**
 * Unsync Asset from Store API
 * POST - Remove a single asset from the connected store
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

    // Get store connection
    const storeService = getStoreService();
    const connection = await storeService.getConnection(clientId);

    if (!connection || connection.status !== 'active') {
      return NextResponse.json({ error: 'No active store connection found' }, { status: 404 });
    }

    // Get latest sync log for this asset
    const latestSync = await db.storeSyncLogs.getLatestByAsset(assetId, connection.id);

    if (!latestSync || latestSync.status !== 'success') {
      return NextResponse.json({ error: 'Asset is not synced to store' }, { status: 400 });
    }

    if (!latestSync.externalImageUrl) {
      return NextResponse.json({ error: 'No external image URL found in sync log' }, { status: 400 });
    }

    // Extract image ID from external image URL or use latestSync data
    // For WooCommerce, we need to get the product and filter the images
    // This is a limitation - we'll need to store the external image ID in sync log
    // For now, we'll create a delete log entry and attempt deletion
    const productId = latestSync.productId;
    const product = await db.products.getById(productId);

    if (!product || !product.storeId) {
      return NextResponse.json({ error: 'Product not found or not mapped to store' }, { status: 404 });
    }

    // Create sync log entry for deletion
    const syncLog = await db.storeSyncLogs.create({
      storeConnectionId: connection.id,
      generatedAssetId: assetId,
      productId,
      action: 'delete',
    });

    try {
      // Note: This implementation requires the external image ID to be stored
      // For WooCommerce, we need to parse it from the URL or store it in the sync log
      // For now, we'll throw an error indicating this needs to be implemented
      throw new Error(
        'Image deletion requires external image ID - not yet implemented in sync log schema'
      );

      // TODO: Once externalImageId is stored in sync log:
      // await storeService.deleteProductImage(clientId, product.storeId, externalImageId);
      // await db.storeSyncLogs.updateStatus(syncLog.id, 'success');

      // return NextResponse.json({ success: true });
    } catch (deleteError: any) {
      // Update sync log with failure
      await db.storeSyncLogs.updateStatus(syncLog.id, 'failed', {
        errorMessage: deleteError.message || 'Unknown error',
      });

      console.error('❌ Store unsync failed:', deleteError);
      return NextResponse.json({ error: deleteError.message || 'Failed to unsync asset from store' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Failed to unsync asset:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
