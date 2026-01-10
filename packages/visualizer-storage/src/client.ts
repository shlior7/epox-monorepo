import { createFilesystemAdapter } from './adapters/filesystem.js';
import { createR2Adapter } from './adapters/r2.js';
import type { StorageAdapter } from './types.js';

let adapter: StorageAdapter | null = null;

function resolveDriver(): string {
  return (process.env.STORAGE_DRIVER ?? process.env.NEXT_PUBLIC_S3_DRIVER ?? 'r2').toLowerCase();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

function resolveFilesystemRoot(): string {
  return process.env.NEXT_PUBLIC_LOCAL_S3_DIR ?? process.env.LOCAL_STORAGE_DIR ?? '.local-storage';
}

function resolvePublicUrl(): string | undefined {
  return process.env.R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL;
}

export function getStorageAdapter(): StorageAdapter {
  if (adapter) {
    return adapter;
  }

  const driver = resolveDriver();
  if (driver === 'fs' || driver === 'filesystem') {
    adapter = createFilesystemAdapter({
      rootDir: resolveFilesystemRoot(),
      publicUrl: process.env.NEXT_PUBLIC_LOCAL_STORAGE_URL,
    });
    return adapter;
  }

  adapter = createR2Adapter({
    endpoint: requireEnv('R2_ENDPOINT'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucket: requireEnv('R2_BUCKET'),
    publicUrl: resolvePublicUrl(),
    region: process.env.R2_REGION ?? 'auto',
  });

  return adapter;
}

export function resetStorageAdapter() {
  adapter = null;
}
