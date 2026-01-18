import { getStorageAdapter } from './client';
import { storagePaths } from './paths';
import type { PresignedUrl, StorageAdapter, StorageFacade, UploadOptions } from './types';

function normalizeKey(clientId: string, path: string): string {
  const trimmed = path.replace(/^\/+/, '');
  const prefix = `clients/${clientId}/`;
  if (trimmed.startsWith(prefix)) {
    return trimmed;
  }
  return `${prefix}${trimmed}`;
}

export function createStorageFacade(adapter: StorageAdapter): StorageFacade {
  async function getUploadUrl(clientId: string, path: string, options?: UploadOptions): Promise<PresignedUrl> {
    const key = normalizeKey(clientId, path);
    return adapter.getUploadUrl(key, options);
  }

  return {
    getUploadUrl,
    getDownloadUrl: adapter.getDownloadUrl,
    upload: adapter.upload,
    download: adapter.download,
    delete: adapter.delete,
    exists: adapter.exists,
    list: adapter.list,
    paths: storagePaths,
    getPublicUrl: adapter.getPublicUrl,
  };
}

export const storage = createStorageFacade(getStorageAdapter());
