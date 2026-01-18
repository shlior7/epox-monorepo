/**
 * Storage Integration Tests
 * Tests file upload, storage, and retrieval
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storage } from '@/lib/services/storage';
import fs from 'fs/promises';
import path from 'path';

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
    expect(storage.paths).toBeDefined();
    expect(storage.paths.getProductImagePath).toBeDefined();
    expect(storage.paths.getGeneratedImagePath).toBeDefined();
  });

  it('should generate correct product image path', () => {
    const path = storage.paths.getProductImagePath('demo-client', 'prod-1', 'image-1.jpg');
    expect(path).toContain('clients/demo-client');
    expect(path).toContain('products');
    expect(path).toContain('prod-1');
    expect(path).toContain('image-1.jpg');
  });

  it('should generate correct generated image path', () => {
    const path = storage.paths.getGeneratedImagePath('demo-client', 'session-1', 'generated-1.jpg');
    expect(path).toContain('clients/demo-client');
    expect(path).toContain('generated');
    expect(path).toContain('session-1');
    expect(path).toContain('generated-1.jpg');
  });
});

describe('Storage Path Helpers', () => {
  it('should generate session flow image paths', () => {
    const path = storage.paths.getSessionFlowImagePath('demo-client', 'session-1', 'flow-1', 'image.jpg');
    expect(path).toContain('clients/demo-client');
    expect(path).toContain('session-1');
    expect(path).toContain('flow-1');
  });

  it('should generate inspiration image paths', () => {
    const path = storage.paths.getInspirationImagePath('demo-client', 'insp-1.jpg');
    expect(path).toContain('clients/demo-client');
    expect(path).toContain('inspiration');
  });

  it('should handle filename sanitization', () => {
    // Test with special characters that might need sanitization
    const filename = 'test image (1).jpg';
    const path = storage.paths.getProductImagePath('demo-client', 'prod-1', filename);
    expect(path).toBeTruthy();
  });

  it('should generate unique paths for different clients', () => {
    const path1 = storage.paths.getProductImagePath('client-1', 'prod-1', 'image.jpg');
    const path2 = storage.paths.getProductImagePath('client-2', 'prod-1', 'image.jpg');

    expect(path1).not.toBe(path2);
    expect(path1).toContain('client-1');
    expect(path2).toContain('client-2');
  });

  it('should generate unique paths for different products', () => {
    const path1 = storage.paths.getProductImagePath('demo-client', 'prod-1', 'image.jpg');
    const path2 = storage.paths.getProductImagePath('demo-client', 'prod-2', 'image.jpg');

    expect(path1).not.toBe(path2);
    expect(path1).toContain('prod-1');
    expect(path2).toContain('prod-2');
  });
});
