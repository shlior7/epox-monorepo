/**
 * S3 Storage Service
 * Handles media uploads/downloads for the S3-compatible store.
 */

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createUpload, isFsDriver } from './adapter';
import { getS3Client, getS3Bucket, S3Paths as S3PathsInternal } from './client';

// Re-export S3Paths for external use
export { S3PathsInternal as S3Paths };

// ===== HELPER FUNCTIONS =====

function resolvePublicBaseUrl(bucket: string): string {
  if (isFsDriver) {
    return process.env.NEXT_PUBLIC_LOCAL_STORAGE_URL ?? '/api/local-s3';
  }

  const publicUrl =
    process.env.R2_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  if (publicUrl) {
    return publicUrl.replace(/\/+$/, '');
  }

  return `https://${bucket}.r2.cloudflarestorage.com`;
}


/**
 * Upload a file to S3
 */
export async function uploadFile(key: string, file: File | Blob): Promise<string> {
  const s3 = getS3Client();
  const bucket = getS3Bucket();

  // Detect content type
  let contentType = file instanceof File ? file.type : 'image/jpeg';

  // If content type is missing or wrong, infer from file extension
  if (!contentType || contentType === 'application/octet-stream' || contentType === 'application/xml') {
    const extension = key.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      json: 'application/json',
    };
    contentType = mimeTypes[extension || 'jpg'] || 'image/jpeg';
    console.log(`📝 S3 Upload: Corrected Content-Type to '${contentType}' based on extension`);
  }

  console.log(`📤 S3 Upload: ${key} (${contentType}, ${file.size} bytes)`);

  // Convert File/Blob to Uint8Array for browser compatibility with AWS SDK
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const shouldUseMultipart = !isFsDriver && file.size >= 5 * 1024 * 1024;

  if (!shouldUseMultipart) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: uint8Array,
      ContentType: contentType,
    });

    await s3.send(command);
  } else {
    // For larger files, use multipart upload without checksums
    console.log(`📦 File is ${(file.size / 1024 / 1024).toFixed(2)}MB, using multipart upload...`);

    // Convert to Blob to ensure proper streaming
    const blob = new Blob([uint8Array], { type: contentType });

    const upload = createUpload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: blob.stream(), // Use stream() for proper ReadableStream in browser
        ContentType: contentType,
      },
    });

    await upload.done();
  }

  // Return the S3 URL
  const url = `${resolvePublicBaseUrl(bucket)}/${key}`;
  console.log(`✅ S3 Upload complete: ${url}`);

  return url;
}

/**
 * Download a file from S3
 */
export async function downloadFile(key: string): Promise<Blob> {
  const s3 = getS3Client();
  const bucket = getS3Bucket();

  console.log(`📥 Downloading file from S3: ${key}`);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error('No body in S3 response');
    }

    // Convert the readable stream to a blob
    const arrayBuffer = await response.Body.transformToByteArray();
    // Create a new Uint8Array with a regular ArrayBuffer to satisfy TypeScript
    const uint8Array = new Uint8Array(arrayBuffer);
    const blob = new Blob([uint8Array], {
      type: response.ContentType || 'application/octet-stream',
    });

    console.log(`✅ Downloaded ${key} (${blob.size} bytes, ${blob.type})`);

    return blob;
  } catch (error) {
    console.error(`❌ Failed to download file from S3: ${key}`, error);
    throw error;
  }
}

/**
 * Delete a file from S3
 */
async function deleteFile(key: string): Promise<void> {
  const s3 = getS3Client();
  const bucket = getS3Bucket();
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3.send(command);
}

// ===== IMAGE OPERATIONS =====

/**
 * Upload an image to a session's media folder
 */
export async function uploadSessionImage(
  clientId: string,
  productId: string,
  sessionId: string,
  filename: string,
  file: File
): Promise<string> {
  const key = S3PathsInternal.getMediaFilePath(clientId, productId, sessionId, filename);
  return await uploadFile(key, file);
}

/**
 * Upload an image to a client session's media folder
 */
export async function uploadClientSessionImage(clientId: string, sessionId: string, filename: string, file: File): Promise<string> {
  const key = S3PathsInternal.getClientSessionMediaFilePath(clientId, sessionId, filename);
  return await uploadFile(key, file);
}

/**
 * Upload a product base image (PNG with transparency for AI)
 * @param clientId - Client ID
 * @param productId - Product ID
 * @param imageId - Image ID (without extension)
 * @param file - PNG file with transparency
 * @returns S3 key
 */
export async function uploadProductImage(clientId: string, productId: string, imageId: string, file: File): Promise<string> {
  const key = S3PathsInternal.getProductImageBasePath(clientId, productId, imageId);
  return await uploadFile(key, file);
}

/**
 * Upload JPEG preview version of a product image
 * Preview images are stored in media/images/preview/ folder
 * @param clientId - Client ID
 * @param productId - Product ID
 * @param imageId - Image ID (without extension)
 * @param jpegDataUrl - JPEG data URL with white background
 * @returns URL of uploaded preview
 */
export async function uploadProductImagePreview(
  clientId: string,
  productId: string,
  imageId: string,
  jpegDataUrl: string
): Promise<string> {
  // Convert data URL to Blob
  const response = await fetch(jpegDataUrl);
  const blob = await response.blob();

  const key = S3PathsInternal.getProductImagePreviewPath(clientId, productId, imageId);
  return await uploadFile(key, blob);
}

/**
 * Upload GLB model file
 * @param clientId - Client ID
 * @param productId - Product ID
 * @param filename - Model filename
 * @param file - GLB file
 * @returns S3 key
 */
export async function uploadProductModel(clientId: string, productId: string, filename: string, file: File | Blob): Promise<string> {
  const key = S3PathsInternal.getProductModelPath(clientId, productId, filename);
  return await uploadFile(key, file);
}

/**
 * Get a signed URL for an image (for private buckets)
 * For public buckets, just return the direct URL
 */
export function getImageUrl(key: string): string {
  const bucket = getS3Bucket();
  return `${resolvePublicBaseUrl(bucket)}/${key}`;
}

export async function withFallbackImage(url: string, fallbackUrl: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return url;
  } catch (_) {}
  return fallbackUrl;
}

/**
 * Get preview image URL for UI display (JPEG with white background)
 * Uses new organized folder structure: media/images/preview/{imageId}.jpg
 * Falls back to legacy paths for backward compatibility
 */
export function getPreviewImageUrl(clientId: string, productId: string, imageId: string): string {
  // New structure: media/images/preview/{imageId}.jpg
  const previewPath = S3PathsInternal.getProductImagePreviewPath(clientId, productId, imageId);
  return getImageUrl(previewPath);
}

/**
 * Get base image URL (PNG with transparency for AI generation)
 * Uses new organized folder structure: media/images/base/{imageId}.png
 */
export function getBaseImageUrl(clientId: string, productId: string, imageId: string): string {
  // New structure: media/images/base/{imageId}.png
  const basePath = S3PathsInternal.getProductImageBasePath(clientId, productId, imageId);
  return getImageUrl(basePath);
}

/**
 * Get the URL for a stored GLB model
 */
export function getProductModelUrl(clientId: string, productId: string, filename: string): string {
  const modelPath = S3PathsInternal.getProductModelPath(clientId, productId, filename);
  return getImageUrl(modelPath);
}

/**
 * Delete a product image (both base PNG and preview JPG)
 * @param clientId - Client ID
 * @param productId - Product ID
 * @param imageId - Image ID (without extension)
 */
export async function deleteProductImage(clientId: string, productId: string, imageId: string): Promise<void> {
  const basePath = S3PathsInternal.getProductImageBasePath(clientId, productId, imageId);
  const previewPath = S3PathsInternal.getProductImagePreviewPath(clientId, productId, imageId);

  console.log(`🗑️  Deleting base image: ${basePath}`);
  await deleteFile(basePath).catch((err) => console.warn(`Failed to delete base image ${basePath}:`, err));

  console.log(`🗑️  Deleting preview image: ${previewPath}`);
  await deleteFile(previewPath).catch((err) => console.warn(`Failed to delete preview image ${previewPath}:`, err));
}
