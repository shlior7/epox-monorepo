/**
 * Storage Testkit
 *
 * Provides test utilities for verifying storage operations.
 * Import this in tests to get a fully functional filesystem-based storage
 * and assertion helpers.
 *
 * @example
 * ```ts
 * import { createTestStorage, assertFileExists, cleanTestStorage } from 'visualizer-storage/testkit';
 *
 * const storage = createTestStorage();
 * await storage.upload('test/file.png', buffer, 'image/png');
 * await assertFileExists('test/file.png');
 * ```
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createFilesystemAdapter } from './adapters/filesystem';
import type { StorageAdapter } from './types';

// Test storage configuration
const DEFAULT_TEST_ROOT = path.join(process.cwd(), '.test-storage');
const DEFAULT_PUBLIC_URL = 'http://localhost:3000/test-storage';

// Tracking for assertions
interface StorageOperation {
  type: 'upload' | 'download' | 'delete';
  key: string;
  timestamp: number;
  size?: number;
  contentType?: string;
}

class StorageTracker {
  private operations: StorageOperation[] = [];

  record(op: Omit<StorageOperation, 'timestamp'>): void {
    this.operations.push({ ...op, timestamp: Date.now() });
  }

  getOperations(): StorageOperation[] {
    return [...this.operations];
  }

  getUploads(): StorageOperation[] {
    return this.operations.filter((op) => op.type === 'upload');
  }

  getUploadedKeys(): string[] {
    return this.getUploads().map((op) => op.key);
  }

  getUploadCount(): number {
    return this.getUploads().length;
  }

  hasUpload(key: string): boolean {
    return this.operations.some((op) => op.type === 'upload' && op.key === key);
  }

  clear(): void {
    this.operations = [];
  }
}

export interface TestStorageConfig {
  rootDir?: string;
  publicUrl?: string;
}

export interface TestStorage extends StorageAdapter {
  /** Get the tracker for assertions */
  tracker: StorageTracker;
  /** Clean up all test files */
  cleanup(): Promise<void>;
  /** Get full file path for a key */
  getFilePath(key: string): string;
  /** Read file as buffer */
  readFile(key: string): Promise<Buffer>;
  /** Check if file exists on disk */
  fileExists(key: string): Promise<boolean>;
}

/**
 * Create a test storage adapter with tracking
 */
export function createTestStorage(config?: TestStorageConfig): TestStorage {
  const rootDir = config?.rootDir ?? DEFAULT_TEST_ROOT;
  const publicUrl = config?.publicUrl ?? DEFAULT_PUBLIC_URL;
  const tracker = new StorageTracker();

  const baseAdapter = createFilesystemAdapter({ rootDir, publicUrl });

  function getFilePath(key: string): string {
    const safeParts = key.split('/').filter(Boolean);
    return path.join(rootDir, ...safeParts);
  }

  return {
    tracker,

    async upload(key: string, data: Buffer | Blob | File, contentType?: string): Promise<void> {
      const size = Buffer.isBuffer(data) ? data.length : undefined;
      tracker.record({ type: 'upload', key, size, contentType });
      return baseAdapter.upload(key, data);
    },

    async download(key: string): Promise<Buffer> {
      tracker.record({ type: 'download', key });
      return baseAdapter.download(key);
    },

    async delete(key: string): Promise<void> {
      tracker.record({ type: 'delete', key });
      return baseAdapter.delete(key);
    },

    exists: baseAdapter.exists,
    list: baseAdapter.list,
    getPublicUrl: baseAdapter.getPublicUrl,
    getUploadUrl: baseAdapter.getUploadUrl,
    getDownloadUrl: baseAdapter.getDownloadUrl,

    getFilePath,

    async readFile(key: string): Promise<Buffer> {
      return fs.readFile(getFilePath(key));
    },

    async fileExists(key: string): Promise<boolean> {
      try {
        await fs.access(getFilePath(key));
        return true;
      } catch {
        return false;
      }
    },

    async cleanup(): Promise<void> {
      try {
        await fs.rm(rootDir, { recursive: true, force: true });
      } catch {
        // Ignore if doesn't exist
      }
      tracker.clear();
    },
  };
}

// Singleton instance for convenience
let _testStorage: TestStorage | null = null;

/**
 * Get or create the singleton test storage
 */
export function getTestStorage(config?: TestStorageConfig): TestStorage {
  if (!_testStorage || config) {
    _testStorage = createTestStorage(config);
  }
  return _testStorage;
}

/**
 * Reset the singleton test storage
 */
export async function resetTestStorage(): Promise<void> {
  if (_testStorage) {
    await _testStorage.cleanup();
    _testStorage = null;
  }
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a file was uploaded to storage
 */
export async function assertFileUploaded(
  storage: TestStorage,
  key: string,
  options?: { contentType?: string; minSize?: number }
): Promise<void> {
  // Check tracker
  const upload = storage.tracker.getUploads().find((op) => op.key === key);
  if (!upload) {
    throw new Error(`Expected file "${key}" to be uploaded, but it wasn't. Uploads: ${storage.tracker.getUploadedKeys().join(', ')}`);
  }

  if (options?.contentType && upload.contentType !== options.contentType) {
    throw new Error(`Expected content type "${options.contentType}" but got "${upload.contentType}"`);
  }

  // Check file exists on disk
  const exists = await storage.fileExists(key);
  if (!exists) {
    throw new Error(`File "${key}" was tracked as uploaded but doesn't exist on disk`);
  }

  if (options?.minSize) {
    const buffer = await storage.readFile(key);
    if (buffer.length < options.minSize) {
      throw new Error(`Expected file size >= ${options.minSize} bytes but got ${buffer.length}`);
    }
  }
}

/**
 * Assert that a file exists in storage
 */
export async function assertFileExists(storage: TestStorage, key: string): Promise<void> {
  const exists = await storage.fileExists(key);
  if (!exists) {
    throw new Error(`Expected file "${key}" to exist but it doesn't`);
  }
}

/**
 * Assert that a file does not exist in storage
 */
export async function assertFileNotExists(storage: TestStorage, key: string): Promise<void> {
  const exists = await storage.fileExists(key);
  if (exists) {
    throw new Error(`Expected file "${key}" to not exist but it does`);
  }
}

/**
 * Assert the number of uploads
 */
export function assertUploadCount(storage: TestStorage, expected: number): void {
  const actual = storage.tracker.getUploadCount();
  if (actual !== expected) {
    throw new Error(`Expected ${expected} uploads but got ${actual}`);
  }
}

/**
 * Assert file content matches expected
 */
export async function assertFileContent(
  storage: TestStorage,
  key: string,
  expected: Buffer | string
): Promise<void> {
  const actual = await storage.readFile(key);
  const expectedBuffer = Buffer.isBuffer(expected) ? expected : Buffer.from(expected);

  if (!actual.equals(expectedBuffer)) {
    throw new Error(`File content mismatch for "${key}"`);
  }
}

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

/** 1x1 red PNG pixel */
export const TEST_IMAGE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

/** 1x1 red PNG pixel as data URL */
export const TEST_IMAGE_PNG_DATA_URL = `data:image/png;base64,${TEST_IMAGE_PNG_BASE64}`;

/** 1x1 red PNG pixel as buffer */
export function getTestImageBuffer(): Buffer {
  return Buffer.from(TEST_IMAGE_PNG_BASE64, 'base64');
}

/**
 * Generate a random test image key
 */
export function generateTestKey(prefix = 'test', ext = 'png'): string {
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

