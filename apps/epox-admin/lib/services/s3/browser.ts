/**
 * Browser-safe helpers for working with S3 object URLs and paths.
 * Import this module from client components instead of the full storage service.
 */

import { resolveS3BucketWithFallback } from './config';
import { S3Paths } from './paths';

export { S3Paths };

type RuntimeConfig = {
  driver: 'aws' | 'fs';
  localDir?: string;
  bucket?: string;
  publicUrl?: string;
};

declare global {
  interface Window {
    __SCENERGY_S3_RUNTIME__?: RuntimeConfig;
  }
}

function readRuntimeConfig(): RuntimeConfig | null {
  if (typeof window !== 'undefined' && window.__SCENERGY_S3_RUNTIME__) {
    return window.__SCENERGY_S3_RUNTIME__;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).__SCENERGY_S3_RUNTIME__) {
    return (globalThis as any).__SCENERGY_S3_RUNTIME__;
  }
  return null;
}

const runtimeConfig = readRuntimeConfig();
const DRIVER = ((runtimeConfig?.driver ?? process.env.NEXT_PUBLIC_S3_DRIVER ?? 'aws') as string).toLowerCase();
const LOCAL_S3_DIR = runtimeConfig?.localDir ?? process.env.NEXT_PUBLIC_LOCAL_S3_DIR ?? null;
const BUCKET_OVERRIDE = runtimeConfig?.bucket;
const PUBLIC_URL_OVERRIDE =
  runtimeConfig?.publicUrl ?? process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ?? process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? null;

function normalizeLocalPrefix(dir?: string | null): string {
  if (!dir || dir.trim().length === 0) return '/.local-s3';
  const trimmed = dir.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, '');
  }

  const normalized = trimmed.replace(/\\/g, '/');
  const isWindowsPath = /^[a-zA-Z]:\//.test(normalized);
  const isPosixPath = normalized.startsWith('/') && !normalized.startsWith('/.');

  if (isWindowsPath || isPosixPath) {
    return '/.local-s3';
  }

  const withoutLeadingSlash = normalized.replace(/^\/+/, '');
  return `/${withoutLeadingSlash}`;
}

function getBucketUrlPrefix(): string {
  if (DRIVER === 'fs') {
    return normalizeLocalPrefix(LOCAL_S3_DIR);
  }

  if (PUBLIC_URL_OVERRIDE) {
    return PUBLIC_URL_OVERRIDE.replace(/\/+$/, '');
  }

  const bucket = BUCKET_OVERRIDE ?? resolveS3BucketWithFallback();
  return `https://${bucket}.r2.cloudflarestorage.com`;
}

export function getImageUrl(key: string): string {
  return `${getBucketUrlPrefix()}/${key}`;
}

export function getPreviewImageUrl(clientId: string, productId: string, imageId: string): string {
  return getImageUrl(S3Paths.getProductImagePreviewPath(clientId, productId, imageId));
}

export function getBaseImageUrl(clientId: string, productId: string, imageId: string): string {
  return getImageUrl(S3Paths.getProductImageBasePath(clientId, productId, imageId));
}

export function getProductModelUrl(clientId: string, productId: string, filename: string): string {
  return getImageUrl(S3Paths.getProductModelPath(clientId, productId, filename));
}

export async function withFallbackImage(url: string, fallbackUrl: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return url;
  } catch (_) {
    // Ignore fetch failures and fallback to provided URL.
  }
  return fallbackUrl;
}
