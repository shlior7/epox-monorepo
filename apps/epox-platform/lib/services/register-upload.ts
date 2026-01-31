/**
 * Shared upload registration logic.
 * Creates product image DB records linking both the original (PNG) and WebP keys.
 */

import { db } from '@/lib/services/db';

export interface RegisterProductImageResult {
  productImageId: string;
}

/**
 * Registers a product image in the database.
 *
 * @param clientId - The client who owns the product
 * @param productId - The product to attach the image to
 * @param webpKey - Storage key for the WebP version (used for display, AI, store)
 * @param originalKey - Storage key for the original file (used for downloads)
 */
export async function registerProductImage(
  clientId: string,
  productId: string,
  webpKey: string,
  originalKey?: string
): Promise<RegisterProductImageResult> {
  const existingImages = await db.productImages.list(productId);
  const sortOrder = existingImages.length;

  const productImageRecord = await db.productImages.create(productId, {
    imageUrl: originalKey ?? webpKey,
    previewUrl: webpKey,
    sortOrder,
  });

  console.log(
    `✅ Created product image record: ${productImageRecord.id} for product ${productId}`
  );

  return { productImageId: productImageRecord.id };
}
