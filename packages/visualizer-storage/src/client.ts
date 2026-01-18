import { createFilesystemAdapter } from './adapters/filesystem';
import { createR2Adapter } from './adapters/r2';
import type { StorageAdapter } from './types';

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
    console.log('📦 Storage: Using filesystem adapter (STORAGE_DRIVER=fs)');
    adapter = createFilesystemAdapter({
      rootDir: resolveFilesystemRoot(),
      publicUrl: process.env.NEXT_PUBLIC_LOCAL_STORAGE_URL,
    });
    return adapter;
  }

  // Check if R2 environment variables are set
  const hasR2Config = Boolean(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );

  // During build time or if R2 config is missing, fall back to filesystem adapter
  if (!hasR2Config || process.env.NEXT_PHASE === 'phase-production-build') {
    if (!hasR2Config) {
      console.warn('⚠️ Storage: R2 configuration MISSING, falling back to filesystem adapter');
      console.warn('   Missing env vars:', {
        R2_ENDPOINT: !!process.env.R2_ENDPOINT,
        R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
        R2_BUCKET: !!process.env.R2_BUCKET,
      });
    }
    adapter = createFilesystemAdapter({
      rootDir: resolveFilesystemRoot(),
      publicUrl: process.env.NEXT_PUBLIC_LOCAL_STORAGE_URL,
    });
    return adapter;
  }

  console.log('📦 Storage: Using R2 adapter');
  console.log('   Bucket:', process.env.R2_BUCKET);
  console.log('   Public URL:', resolvePublicUrl());

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
