/**
 * Storage Service - Re-exports from shared visualizer-storage
 * All file storage operations (R2/S3) live in the shared package
 */

// Re-export everything from the shared storage package
export { storage, createStorageFacade, storagePaths } from 'visualizer-storage';
export type { PresignedUrl, UploadOptions, StorageObject, StorageFacade } from 'visualizer-storage';
