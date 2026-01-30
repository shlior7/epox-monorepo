/**
 * Sync Asset to Store API
 * POST - Sync a single asset to the connected store
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';
import { getStoreService } from '@/lib/services/erp';
import { resolveStorageUrlAbsolute } from 'visualizer-storage';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assetId, productId } = body;

    // Validate request
    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
    }

    // Get first product ID from asset
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Get asset
    const asset = await db.generatedAssets.getById(assetId);
    if (!asset || asset.clientId !== clientId) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
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
      // Resolve asset URL to an absolute URL for the external store.
      // In filesystem/dev mode, assetUrl is a relative path like "/api/local-s3/..."
      // which WooCommerce/Shopify cannot reach. We need a full URL.
      let imageSourceUrl = resolveStorageUrlAbsolute(asset.assetUrl) || asset.assetUrl;

      // If still relative (no WORKER_STORAGE_BASE_URL set), build from request origin
      if (imageSourceUrl.startsWith('/')) {
        const origin = request.headers.get('origin')
          || request.headers.get('x-forwarded-host') && `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
          || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}`;
        imageSourceUrl = `${origin}${imageSourceUrl}`;
      }

      // Sync to store (upload image)
      const uploadedImages = await storeService.updateProductImages(clientId, product.storeId, [
        { src: imageSourceUrl, name: '', alt: '' },
      ]);

      const externalImageId = uploadedImages[0]?.id?.toString();
      const externalImageUrl = uploadedImages[0]?.src;

      // Update sync log with success
      const updatedLog = await db.storeSyncLogs.updateStatus(syncLog.id, 'success', {
        externalImageUrl,
      });

      // Store the external image ID in the asset for bidirectional sync tracking
      if (externalImageId) {
        await db.generatedAssets.update(assetId, {
          externalImageId,
          syncedAt: new Date(),
        });

        console.log(
          `✅ Synced asset ${assetId} to store with external image ID: ${externalImageId}`
        );
      }

      // Add the synced asset to the product's base images if not already there
      // Extract R2 key from asset URL (assuming format: https://domain/path/to/r2Key)
      const r2KeyMatch = asset.assetUrl.match(/\/([^/]+\.(jpg|jpeg|png|webp|gif))$/i);
      const imageUrl = r2KeyMatch ? r2KeyMatch[1] : asset.assetUrl;

      // Check if this asset is already in the product's base images
      const existingImages = await db.productImages.list(productId);
      const alreadyExists = existingImages.some((img) =>
        img.imageUrl === imageUrl ||
        (externalImageId && img.externalImageId === externalImageId)
      );

      if (!alreadyExists) {
        // Add as a base image
        await db.productImages.create(productId, {
          imageUrl,
          syncStatus: 'synced',
          externalImageId: externalImageId || null,
          originalStoreUrl: externalImageUrl || null,
          sortOrder: existingImages.length,
          isPrimary: existingImages.length === 0, // Make it primary if it's the first image
        });

        console.log(`✅ Added synced asset to product ${productId} base images`);
      }

      return NextResponse.json({
        success: true,
        syncId: updatedLog.id,
        externalImageId,
      });
    } catch (syncError: any) {
      // Update sync log with failure
      await db.storeSyncLogs.updateStatus(syncLog.id, 'failed', {
        errorMessage: syncError.message || 'Unknown error',
      });

      console.error('❌ Store sync failed:', syncError);
      // Surface the underlying error for debugging
      const message = syncError?.response?.data?.message
        || syncError?.message
        || 'Failed to sync asset to store';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Failed to sync asset:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
