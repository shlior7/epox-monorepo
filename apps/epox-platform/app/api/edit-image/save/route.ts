/**
 * API Route: Save edited image to R2
 * POST /api/edit-image/save
 *
 * Takes a data URL and saves it to R2 storage.
 * Supports two modes:
 * - 'overwrite': Replace the original image (base image or generated asset)
 * - 'copy': Create a new generated asset
 */

import { NextResponse } from 'next/server';
import { withGenerationSecurity, validateImageUrl } from '@/lib/security';
import { logger } from '@/lib/logger';
import { storage, storagePaths } from 'visualizer-storage';
import { db } from 'visualizer-db';

interface SaveEditRequest {
  /** The edited image as a data URL */
  imageDataUrl: string;
  /** Type of original image being edited */
  imageType: 'generated' | 'base';
  /** Save mode: 'overwrite' replaces original, 'copy' creates new asset */
  mode?: 'overwrite' | 'copy';
  /** For overwriting generated assets - the asset ID to update */
  assetId?: string;
  /** For overwriting base images - the product image ID to update */
  productImageId?: string;
  /** Product ID for context */
  productId?: string;
  /** Generation flow ID (for copy mode - links new asset to flow) */
  flowId?: string;
  /** Edit prompt used (for metadata) */
  prompt?: string;
}

interface SaveEditResponse {
  success: boolean;
  /** The R2 URL of the saved image */
  imageUrl?: string;
  /** The asset/image ID */
  imageId?: string;
  /** For base images - whether it's now unsynced from store */
  unsyncedFromStore?: boolean;
  error?: string;
}

/**
 * Convert base64 data URL to buffer
 */
function base64ToBuffer(base64: string): { buffer: Buffer; mimeType: string } {
  if (base64.startsWith('data:')) {
    const matches = /^data:(.+);base64,(.+)$/.exec(base64);
    if (!matches) {
      throw new Error('Invalid base64 data URL');
    }
    return { buffer: Buffer.from(matches[2], 'base64'), mimeType: matches[1] };
  }
  return { buffer: Buffer.from(base64, 'base64'), mimeType: 'image/png' };
}

/**
 * Generate a unique asset ID
 */
function generateAssetId(): string {
  return `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const POST = withGenerationSecurity(
  async (request, context): Promise<NextResponse<SaveEditResponse>> => {
    const clientId = context.clientId;
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      const body: SaveEditRequest = await request.json();
      const mode = body.mode ?? 'overwrite';

      // Validate required fields
      if (!body.imageDataUrl) {
        return NextResponse.json(
          { success: false, error: 'Missing imageDataUrl' },
          { status: 400 }
        );
      }

      if (!body.imageType) {
        return NextResponse.json(
          { success: false, error: 'Missing imageType' },
          { status: 400 }
        );
      }

      // Validate data URL format
      const urlValidation = validateImageUrl(body.imageDataUrl);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { success: false, error: urlValidation.error ?? 'Invalid image data URL' },
          { status: 400 }
        );
      }

      logger.info(
        {
          clientId,
          imageType: body.imageType,
          mode,
          productId: body.productId,
          flowId: body.flowId,
          assetId: body.assetId,
          productImageId: body.productImageId,
        },
        '[edit-image/save] Saving edited image'
      );

      const { buffer, mimeType } = base64ToBuffer(body.imageDataUrl);
      const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('jpeg') ? 'jpg' : 'png';

      // ===== COPY MODE: Create new generated asset =====
      if (mode === 'copy') {
        const assetId = generateAssetId();

        // Use flowId if provided, otherwise use a standalone edit flow ID
        const flowIdForStorage = body.flowId || `edit-${Date.now()}`;

        // Generate storage path
        const storagePath = storagePaths.generationAsset(clientId, flowIdForStorage, assetId, ext);

        // Upload to R2
        await storage.upload(storagePath, buffer, mimeType);
        const imageUrl = storage.getPublicUrl(storagePath);

        // Create new generated asset record
        // Note: flowId is optional - if not provided, asset is standalone (not in a flow)
        await db.generatedAssets.createWithId(assetId, {
          clientId,
          generationFlowId: body.flowId ?? null, // null if no flow context
          assetUrl: imageUrl,
          assetType: 'image',
          status: 'completed',
          prompt: body.prompt ?? 'Edited image',
          productIds: body.productId ? [body.productId] : [],
          completedAt: new Date(),
        });

        // Insert into junction table for proper product linking
        if (body.productId) {
          await db.generatedAssets.linkProductToAsset(assetId, body.productId, true);
        }

        logger.info(
          { assetId, imageUrl, flowId: body.flowId, productId: body.productId },
          '[edit-image/save] Created new generated asset (copy)'
        );

        return NextResponse.json({
          success: true,
          imageUrl,
          imageId: assetId,
        });
      }

      // ===== OVERWRITE MODE =====

      if (body.imageType === 'base') {
        // Overwriting base image
        if (!body.productImageId) {
          return NextResponse.json(
            { success: false, error: 'Missing productImageId for base image overwrite' },
            { status: 400 }
          );
        }

        // Generate storage path for base image
        const editedId = `edited_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const storagePath = storagePaths.productImageBase(clientId, body.productId ?? 'unknown', editedId);

        // Upload to R2
        await storage.upload(storagePath, buffer, mimeType);
        const imageUrl = storage.getPublicUrl(storagePath);

        // Get the current product image to check if it's synced
        const currentImage = await db.productImages.getById(body.productImageId);

        if (!currentImage) {
          return NextResponse.json(
            { success: false, error: 'Product image not found' },
            { status: 404 }
          );
        }

        // If image is synced with store, update the store image
        let storeUpdateSuccess = false;
        if (currentImage.syncStatus === 'synced' && currentImage.externalImageId && body.productId) {
          try {
            // Get product to find store ID
            const productWithStore = await db.products.getById(body.productId!);

            if (productWithStore?.storeId) {
              // Get store connection
              const connection = await db.storeConnections.getByClientId(clientId);

              if (connection && connection.status === 'active') {
                // Decrypt credentials
                const { decryptCredentials } = await import('@scenergy/erp-service');
                const credentials = await decryptCredentials({
                  ciphertext: connection.credentialsCiphertext,
                  iv: connection.credentialsIv,
                  tag: connection.credentialsTag,
                  keyId: connection.credentialsKeyId,
                  fingerprint: connection.credentialsFingerprint,
                });

                // Get ERP provider
                const { providers } = await import('@scenergy/erp-service');
                const provider = providers[connection.storeType as 'woocommerce' | 'shopify'];

                // Update the image in the store
                await provider.updateSingleProductImage(
                  credentials,
                  productWithStore.storeId!,
                  currentImage.externalImageId,
                  {
                    src: imageUrl,
                    alt: currentImage.externalImageId, // Keep existing alt or could be enhanced
                    name: `edited_${Date.now()}`,
                  }
                );

                storeUpdateSuccess = true;

                logger.info(
                  {
                    productImageId: body.productImageId,
                    storeId: productWithStore.storeId,
                    externalImageId: currentImage.externalImageId,
                  },
                  '[edit-image/save] Store image updated successfully'
                );
              }
            }
          } catch (error) {
            logger.error(
              { error, productImageId: body.productImageId },
              '[edit-image/save] Failed to update store image, will mark as unsynced'
            );
            // Continue to update locally but mark as unsynced
          }
        }

        // Update the product_image record
        await db.productImages.updateImageAndSyncStatus(
          body.productImageId,
          storagePath,
          storeUpdateSuccess ? 'synced' : 'unsynced'
        );

        logger.info(
          { productImageId: body.productImageId, imageUrl, storeUpdateSuccess },
          '[edit-image/save] Base image overwritten'
        );

        return NextResponse.json({
          success: true,
          imageUrl,
          imageId: body.productImageId,
          unsyncedFromStore: !storeUpdateSuccess,
        });
      } else {
        // Overwriting generated asset
        if (!body.assetId) {
          return NextResponse.json(
            { success: false, error: 'Missing assetId for generated asset overwrite' },
            { status: 400 }
          );
        }

        // Generate storage path using existing asset ID
        const flowIdForStorage = body.flowId || `edit-${Date.now()}`;
        const storagePath = storagePaths.generationAsset(clientId, flowIdForStorage, body.assetId, ext);

        // Upload to R2
        await storage.upload(storagePath, buffer, mimeType);
        const imageUrl = storage.getPublicUrl(storagePath);

        // Update the generated asset record with new URL
        await db.generatedAssets.update(body.assetId, {
          assetUrl: imageUrl,
          prompt: body.prompt ?? 'Edited image',
        });

        logger.info(
          { assetId: body.assetId, imageUrl },
          '[edit-image/save] Generated asset overwritten'
        );

        return NextResponse.json({
          success: true,
          imageUrl,
          imageId: body.assetId,
        });
      }
    } catch (error) {
      logger.error({ error }, '[edit-image/save] Failed to save edited image');
      return NextResponse.json(
        { success: false, error: 'Failed to save edited image' },
        { status: 500 }
      );
    }
  }
);
