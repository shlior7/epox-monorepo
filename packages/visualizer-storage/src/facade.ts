import { getStorageAdapter } from './client.js';
import { storagePaths } from './paths.js';
import type { PresignedUrl, StorageAdapter, StorageFacade, UploadOptions } from './types.js';

function normalizeKey(orgId: string, path: string): string {
  const trimmed = path.replace(/^\/+/, '');
  const prefix = `orgs/${orgId}/`;
  if (trimmed.startsWith(prefix)) {
    return trimmed;
  }
  return `${prefix}${trimmed}`;
}

export function createStorageFacade(adapter: StorageAdapter): StorageFacade {
  async function getUploadUrl(orgId: string, path: string, options?: UploadOptions): Promise<PresignedUrl> {
    const key = normalizeKey(orgId, path);
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
