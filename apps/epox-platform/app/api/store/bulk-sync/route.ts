/**
 * Bulk Sync Assets to Store API
 * POST - Sync multiple assets to the connected store
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
    const { assetIds } = body;

    // Validate request
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: 'assetIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (assetIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 assets can be synced at once' },
        { status: 400 }
      );
    }

    // Get store connection
    const storeService = getStoreService();
    const connection = await storeService.getConnection(clientId);

    if (!connection || connection.status !== 'active') {
      return NextResponse.json({ error: 'No active store connection found' }, { status: 404 });
    }

    // Process each asset
    const results = await Promise.allSettled(
      assetIds.map(async (assetId) => {
        try {
          // Get asset
          const asset = await db.generatedAssets.getById(assetId);
          if (!asset || asset.clientId !== clientId) {
            throw new Error('Asset not found');
          }

          // Get first product ID
          const productId = asset.productIds?.[0];
          if (!productId) {
            throw new Error('Asset has no associated product');
          }

          // Get product with store mapping
          const product = await db.products.getById(productId);
          if (!product || product.clientId !== clientId) {
            throw new Error('Product not found');
          }

          if (!product.storeId) {
            throw new Error('Product must be mapped to a store product before syncing');
          }

          // Create sync log entry
          const syncLog = await db.storeSyncLogs.create({
            storeConnectionId: connection.id,
            generatedAssetId: assetId,
            productId,
            action: 'upload',
          });

          try {
            // Sync to store
            const uploadedImages = await storeService.updateProductImages(
              clientId,
              product.storeId,
              [{ src: asset.assetUrl, name: '', alt: '' }]
            );

            // Update sync log with success
            const updatedLog = await db.storeSyncLogs.updateStatus(syncLog.id, 'success', {
              externalImageUrl: uploadedImages[0]?.src,
            });

            return {
              assetId,
              syncId: updatedLog.id,
              success: true,
              externalImageId: uploadedImages[0]?.id?.toString(),
            };
          } catch (syncError: any) {
            // Update sync log with failure
            await db.storeSyncLogs.updateStatus(syncLog.id, 'failed', {
              errorMessage: syncError.message || 'Unknown error',
            });

            throw syncError;
          }
        } catch (error: any) {
          return {
            assetId,
            success: false,
            error: error.message || 'Unknown error',
          };
        }
      })
    );

    // Map results
    const mappedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          assetId: assetIds[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    const successCount = mappedResults.filter((r) => r.success).length;
    const failureCount = mappedResults.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      results: mappedResults,
      summary: {
        total: assetIds.length,
        succeeded: successCount,
        failed: failureCount,
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to bulk sync assets:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
