import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PresignedUrl, StorageAdapter, StorageObject, UploadOptions } from '../types.js';

export type FilesystemAdapterConfig = {
  rootDir: string;
  publicUrl?: string;
};

function normalizePublicUrl(url?: string): string {
  if (!url) return '/api/local-s3';
  return url.replace(/\/+$/, '');
}

function sanitizeSegment(segment: string) {
  return segment.replace(/\.{2,}/g, '').replace(/[*?"<>|\\]/g, '_');
}

function resolveKeyPath(rootDir: string, key: string): string {
  const safeParts = key.split('/').map(sanitizeSegment).filter(Boolean);
  const fullPath = path.resolve(rootDir, ...safeParts);
  if (!fullPath.startsWith(path.resolve(rootDir))) {
    throw new Error('Invalid storage key');
  }
  return fullPath;
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function toBuffer(data: Buffer | Blob | File): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer);
  if (typeof (data as Blob).arrayBuffer === 'function') {
    return Buffer.from(await (data as Blob).arrayBuffer());
  }
  return Buffer.from(String(data));
}

async function listRecursive(dir: string, prefixKey: string, results: StorageObject[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const entryKey = `${prefixKey}${entry.name}`;
    if (entry.isDirectory()) {
      await listRecursive(absolutePath, `${entryKey}/`, results);
    } else {
      const stat = await fs.stat(absolutePath);
      results.push({
        key: entryKey,
        size: stat.size,
        lastModified: stat.mtime,
      });
    }
  }
}

export function createFilesystemAdapter(config: FilesystemAdapterConfig): StorageAdapter {
  const rootDir = path.resolve(config.rootDir);
  const publicUrl = normalizePublicUrl(config.publicUrl);

  async function getUploadUrl(key: string, options?: UploadOptions): Promise<PresignedUrl> {
    const expiresIn = options?.expiresIn ?? 60;
    return {
      url: `${publicUrl}/${key}`,
      key,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async function getDownloadUrl(key: string): Promise<string> {
    return `${publicUrl}/${key}`;
  }

  async function upload(key: string, data: Buffer | Blob | File): Promise<void> {
    const filePath = resolveKeyPath(rootDir, key);
    await ensureDir(filePath);
    const buffer = await toBuffer(data);
    await fs.writeFile(filePath, buffer);
  }

  async function download(key: string): Promise<Buffer> {
    const filePath = resolveKeyPath(rootDir, key);
    return fs.readFile(filePath);
  }

  async function remove(key: string): Promise<void> {
    const filePath = resolveKeyPath(rootDir, key);
    await fs.rm(filePath, { force: true });
  }

  async function exists(key: string): Promise<boolean> {
    const filePath = resolveKeyPath(rootDir, key);
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch (error: any) {
      if (error?.code === 'ENOENT') return false;
      throw error;
    }
  }

  async function list(prefix: string): Promise<StorageObject[]> {
    const dirPath = resolveKeyPath(rootDir, prefix);
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        return [];
      }
    } catch (error: any) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }

    const results: StorageObject[] = [];
    await listRecursive(dirPath, prefix.endsWith('/') ? prefix : `${prefix}/`, results);
    return results;
  }

  function getPublicUrl(key: string): string {
    return `${publicUrl}/${key}`;
  }

  return {
    getUploadUrl,
    getDownloadUrl,
    upload,
    download,
    delete: remove,
    exists,
    list,
    getPublicUrl,
  };
}
