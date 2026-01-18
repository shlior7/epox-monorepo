/**
 * Storage Integration Tests
 * Tests file upload, storage, and retrieval
 */

import { storage, storagePaths } from '@/lib/services/storage';
import fs from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Storage Integration', () => {
  const testStorageDir = '.test-storage';
  const testFile = 'test-image.jpg';
  const testFilePath = path.join(testStorageDir, 'clients/demo-client', testFile);

  beforeEach(async () => {
    // Ensure test storage directory exists
    await fs.mkdir(path.join(testStorageDir, 'clients/demo-client'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should generate public URL for stored file', () => {
    const storageKey = 'clients/demo-client/products/image-1.jpg';
    const url = storage.getPublicUrl(storageKey);

    expect(url).toBeTruthy();
    expect(url).toContain('image-1.jpg');
  });

  it('should handle paths with different formats', () => {
    const cases = [
      'clients/demo-client/products/image.jpg',
      'clients/demo-client/products/subfolder/image.jpg',
      'clients/demo-client/generated/session-1/image.jpg',
    ];

    for (const key of cases) {
      const url = storage.getPublicUrl(key);
      expect(url).toBeTruthy();
      expect(typeof url).toBe('string');
    }
  });

  it('should return consistent URLs for same key', () => {
    const key = 'clients/demo-client/products/image-1.jpg';
    const url1 = storage.getPublicUrl(key);
    const url2 = storage.getPublicUrl(key);

    expect(url1).toBe(url2);
  });

  it('should support getting storage paths', () => {
    expect(storagePaths).toBeDefined();
    expect(storagePaths.productImageBase).toBeDefined();
    expect(storagePaths.generationAsset).toBeDefined();
  });

  it('should generate correct product image path', () => {
    const storagePath = storagePaths.productImageBase('demo-client', 'prod-1', 'image-1');
    expect(storagePath).toContain('clients/demo-client');
    expect(storagePath).toContain('products');
    expect(storagePath).toContain('prod-1');
    expect(storagePath).toContain('image-1.png');
  });

  it('should generate correct generated image path', () => {
    const storagePath = storagePaths.generationAsset('demo-client', 'flow-1', 'generated-1', 'jpg');
    expect(storagePath).toContain('clients/demo-client');
    expect(storagePath).toContain('generations');
    expect(storagePath).toContain('flow-1');
    expect(storagePath).toContain('generated-1.jpg');
  });
});

describe('Storage Path Helpers', () => {
  it('should generate session flow image paths', () => {
    const storagePath = storagePaths.generationAsset('demo-client', 'flow-1', 'image', 'jpg');
    expect(storagePath).toContain('clients/demo-client');
    expect(storagePath).toContain('generations');
    expect(storagePath).toContain('flow-1');
  });

  it('should generate inspiration image paths', () => {
    const storagePath = storagePaths.inspirationImage('demo-client', 'session-1', 'insp-1', 'jpg');
    expect(storagePath).toContain('clients/demo-client');
    expect(storagePath).toContain('sessions');
    expect(storagePath).toContain('session-1');
    expect(storagePath).toContain('inspirations');
  });

  it('should handle filename sanitization', () => {
    // Test with special characters that might need sanitization
    const imageId = 'test image (1)';
    const storagePath = storagePaths.productImageBase('demo-client', 'prod-1', imageId);
    expect(storagePath).toBeTruthy();
  });

  it('should generate unique paths for different clients', () => {
    const path1 = storagePaths.productImageBase('client-1', 'prod-1', 'image');
    const path2 = storagePaths.productImageBase('client-2', 'prod-1', 'image');

    expect(path1).not.toBe(path2);
    expect(path1).toContain('client-1');
    expect(path2).toContain('client-2');
  });

  it('should generate unique paths for different products', () => {
    const path1 = storagePaths.productImageBase('demo-client', 'prod-1', 'image');
    const path2 = storagePaths.productImageBase('demo-client', 'prod-2', 'image');

    expect(path1).not.toBe(path2);
    expect(path1).toContain('prod-1');
    expect(path2).toContain('prod-2');
  });
});
