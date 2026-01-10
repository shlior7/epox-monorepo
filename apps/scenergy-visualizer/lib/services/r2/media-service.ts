/**
 * R2 Media Service
 * Server-only helpers for media operations backed by R2 (S3-compatible).
 */

import {
  S3Paths as MediaPaths,
  uploadFile,
  downloadFile,
  uploadSessionImage,
  uploadClientSessionImage,
  uploadProductImage,
  uploadProductImagePreview,
  uploadProductModel,
  deleteProductImage,
  getPreviewImageUrl,
  getBaseImageUrl,
  getProductModelUrl,
} from '@/lib/services/s3/storage-service';

export { MediaPaths };
export {
  uploadFile,
  downloadFile,
  uploadSessionImage,
  uploadClientSessionImage,
  uploadProductImage,
  uploadProductImagePreview,
  uploadProductModel,
  deleteProductImage,
  getPreviewImageUrl,
  getBaseImageUrl,
  getProductModelUrl,
};
