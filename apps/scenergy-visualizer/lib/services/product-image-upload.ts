/**
 * Product Image Upload Service
 * Handles uploading base images and previews to S3
 * Shared logic extracted from DataContext
 */

import { apiClient } from '@/lib/api-client';

export interface UploadImagesOptions {
  clientId: string;
  productId: string;
  imageFiles: File[];
  jpegPreviews?: string[];
}

export interface UploadImagesResult {
  imageIds: string[];
  errors: Array<{ imageId: string; error: Error }>;
}

export interface DeleteImagesOptions {
  clientId: string;
  productId: string;
  imageIds: string[];
}

export interface DeleteImagesResult {
  deletedIds: string[];
  errors: Array<{ imageId: string; error: Error }>;
}

/**
 * Upload product images (base PNGs and optional JPEG previews) to S3
 * Returns array of image IDs (UUIDs without extensions)
 *
 * @param options - Upload configuration
 * @returns Array of successfully uploaded image IDs
 */
export async function uploadProductImages(options: UploadImagesOptions): Promise<UploadImagesResult> {
  const { clientId, productId, imageFiles, jpegPreviews } = options;

  console.log(`📤 Uploading ${imageFiles.length} product image(s)...`);

  const results = await Promise.allSettled(
    imageFiles.map(async (file, index) => {
      // Extract UUID from filename (file.name is already "uuid.png" from processGLBToImages)
      // Remove the extension to get just the UUID
      const imageId = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const imageFilename = file.name; // Use original filename as-is (already has UUID.extension format)

      console.log(`   📦 Processing file: ${file.name} → imageId: ${imageId}, filename: ${imageFilename}`);

      // Upload base image (PNG with transparency)
      await apiClient.uploadProductImage(clientId, productId, imageId, file);
      console.log(`   ✅ Uploaded base image: ${imageId}`);

      // Upload JPEG preview if provided (from GLB processing)
      if (jpegPreviews && jpegPreviews[index]) {
        console.log(`   📤 Uploading preview for ${imageId}...`);
        await apiClient.uploadProductImagePreview(clientId, productId, imageId, jpegPreviews[index]);
        console.log(`   ✅ Uploaded preview for ${imageId}`);
      }

      return imageId; // Return only the UUID, not the filename with extension
    })
  );

  const imageIds: string[] = [];
  const errors: Array<{ imageId: string; error: Error }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      imageIds.push(result.value);
    } else {
      errors.push({
        imageId: `file-${index}`,
        error: result.reason,
      });
      console.error(`   ❌ Failed to upload image ${index}:`, result.reason);
    }
  });

  console.log(`✅ Successfully uploaded ${imageIds.length} images`);
  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} image(s) failed to upload`);
  }

  return { imageIds, errors };
}

/**
 * Delete product images (both base PNGs and preview JPGs) from S3
 *
 * @param options - Delete configuration
 * @returns Object with deleted IDs and any errors
 */
export async function deleteProductImages(options: DeleteImagesOptions): Promise<DeleteImagesResult> {
  const { clientId, productId, imageIds } = options;

  if (imageIds.length === 0) {
    return { deletedIds: [], errors: [] };
  }

  console.log(`🗑️  Deleting ${imageIds.length} image(s) from S3:`, imageIds);

  const response = await apiClient.deleteProductImages(clientId, productId, imageIds);

  const deletedIds = response.deletedIds;
  const errors = response.errors.map((entry) => ({ imageId: entry.imageId, error: new Error(entry.error) }));

  console.log(`✅ Successfully deleted ${deletedIds.length} images`);
  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} image(s) failed to delete`);
  }

  return { deletedIds, errors };
}

/**
 * Extract image ID from filename (removes extension)
 *
 * @param filename - Filename with extension (e.g., "uuid.png")
 * @returns Image ID without extension
 */
export function extractImageId(filename: string): string {
  return filename.replace(/\.(png|jpg|jpeg|webp)$/i, '');
}

/**
 * Validate that image IDs don't contain file extensions
 */
export function validateImageIds(imageIds: string[]): boolean {
  return imageIds.every((id) => !id.match(/\.(png|jpg|jpeg|webp)$/i));
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
}
