export { storage, createStorageFacade } from './facade';
export { storagePaths } from './paths';
export type { PresignedUrl, UploadOptions, StorageObject, StorageFacade } from './types';

// Download service
export { DownloadService, getDownloadService, resetDownloadService } from './download/index';
export type {
  DownloadServiceConfig,
  DownloadJob,
  DownloadJobStatus,
  CreateDownloadJobRequest,
  SingleDownloadResult,
  BulkDownloadResult,
} from './download/index';
