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
      return NextResponse.json(
        { error: 'No external image URL found in sync log' },
        { status: 400 }
      );
    }

    // Extract image ID from external image URL or use latestSync data
    // For WooCommerce, we need to get the product and filter the images
    // This is a limitation - we'll need to store the external image ID in sync log
    // For now, we'll create a delete log entry and attempt deletion
    const productId = latestSync.productId;
    const product = await db.products.getById(productId);

    if (!product || !product.storeId) {
      return NextResponse.json(
        { error: 'Product not found or not mapped to store' },
        { status: 404 }
      );
    }

    // Create sync log entry for deletion
    const syncLog = await db.storeSyncLogs.create({
      storeConnectionId: connection.id,
      generatedAssetId: assetId,
      productId,
      action: 'delete',
    });

    try {
      // Remove from product base images if it exists
      const r2KeyMatch = asset.assetUrl.match(/\/([^/]+\.(jpg|jpeg|png|webp|gif))$/i);
      const imageUrl = r2KeyMatch ? r2KeyMatch[1] : asset.assetUrl;

      const existingImages = await db.productImages.list(productId);
      const imageToRemove = existingImages.find((img) =>
        img.imageUrl === imageUrl ||
        (asset.externalImageId && img.externalImageId === asset.externalImageId)
      );

      if (imageToRemove) {
        await db.productImages.delete(imageToRemove.id);
        console.log(`✅ Removed asset from product ${productId} base images`);
      }

      // Clear external image ID from asset
      await db.generatedAssets.update(assetId, {
        externalImageId: null,
        syncedAt: null,
      });

      // Try to delete from store if we have the external image ID
      if (asset.externalImageId) {
        try {
          await storeService.deleteProductImage(clientId, product.storeId, asset.externalImageId);
          await db.storeSyncLogs.updateStatus(syncLog.id, 'success');
          console.log(`✅ Deleted image from store with external ID: ${asset.externalImageId}`);
        } catch (storeDeleteError: any) {
          // Log the failure but still return success since we removed from base images
          await db.storeSyncLogs.updateStatus(syncLog.id, 'failed', {
            errorMessage: storeDeleteError.message || 'Failed to delete from store',
          });
          console.warn(`⚠️ Failed to delete from store but removed from base images:`, storeDeleteError.message);
        }
      } else {
        // No external ID - just mark as success since we removed from base images
        await db.storeSyncLogs.updateStatus(syncLog.id, 'success', {
          errorMessage: 'No external image ID - only removed from base images',
        });
        console.log(`✅ Removed from base images (no external ID to delete from store)`);
      }

      return NextResponse.json({ success: true });
    } catch (deleteError: any) {
      // Update sync log with failure
      await db.storeSyncLogs.updateStatus(syncLog.id, 'failed', {
        errorMessage: deleteError.message || 'Unknown error',
      });

      console.error('❌ Store unsync failed:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to unsync asset from store' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Failed to unsync asset:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
