/**
 * Unit Tests: Persistence Layer
 *
 * Tests storage and database operations for saving generated images.
 * Uses filesystem adapter for storage and mocks database.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { TEST_CONFIG } from '../setup';

// Test image: 1x1 red PNG pixel
const TEST_IMAGE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

// Mock the persistence module dependencies
vi.mock('visualizer-storage', () => ({
  storage: {
    upload: vi.fn().mockResolvedValue(undefined),
    getPublicUrl: vi.fn().mockImplementation((key: string) => `http://test-cdn.com/${key}`),
  },
  storagePaths: {
    generationAsset: (clientId: string, flowId: string, assetId: string, ext: string) =>
      `clients/${clientId}/generations/${flowId}/assets/${assetId}.${ext}`,
  },
}));

vi.mock('visualizer-db', () => ({
  db: {
    generatedAssets: {
      create: vi.fn().mockImplementation((data) => ({
        id: `asset-${Date.now()}`,
        ...data,
        createdAt: new Date(),
      })),
    },
  },
}));

describe('Persistence Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Base64 Conversion', () => {
    it('should extract buffer from data URL', () => {
      // Test the base64 conversion logic
      const dataUrl = TEST_IMAGE_BASE64;
      const matches = /^data:(.+);base64,(.+)$/.exec(dataUrl);

      expect(matches).not.toBeNull();
      expect(matches![1]).toBe('image/png');

      const buffer = Buffer.from(matches![2], 'base64');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle raw base64 without data URL prefix', () => {
      const rawBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(rawBase64, 'base64');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should detect PNG format', () => {
      const dataUrl = 'data:image/png;base64,abc123';
      const matches = /^data:(.+);base64,/.exec(dataUrl);

      expect(matches![1]).toBe('image/png');
    });

    it('should detect JPEG format', () => {
      const dataUrl = 'data:image/jpeg;base64,abc123';
      const matches = /^data:(.+);base64,/.exec(dataUrl);

      expect(matches![1]).toBe('image/jpeg');
    });

    it('should detect WebP format', () => {
      const dataUrl = 'data:image/webp;base64,abc123';
      const matches = /^data:(.+);base64,/.exec(dataUrl);

      expect(matches![1]).toBe('image/webp');
    });
  });

  describe('Storage Path Generation', () => {
    it('should generate correct path for flow assets', async () => {
      const { storagePaths } = await import('visualizer-storage');
      const path = storagePaths.generationAsset('client-1', 'flow-123', 'asset-456', 'png');

      expect(path).toBe('clients/client-1/generations/flow-123/assets/asset-456.png');
    });

    it('should handle different file extensions', async () => {
      const { storagePaths } = await import('visualizer-storage');

      const pngPath = storagePaths.generationAsset('c1', 'f1', 'a1', 'png');
      const jpgPath = storagePaths.generationAsset('c1', 'f1', 'a2', 'jpg');
      const webpPath = storagePaths.generationAsset('c1', 'f1', 'a3', 'webp');

      expect(pngPath).toContain('.png');
      expect(jpgPath).toContain('.jpg');
      expect(webpPath).toContain('.webp');
    });
  });

  describe('saveGeneratedImage', () => {
    it('should upload to storage and create DB record', async () => {
      const { saveGeneratedImage } = await import('../../src/persistence');
      const { storage } = await import('visualizer-storage');
      const { db } = await import('visualizer-db');

      const result = await saveGeneratedImage({
        clientId: 'client-1',
        sessionId: 'session-1',
        prompt: 'A beautiful landscape',
        jobId: 'job-123',
        base64Data: TEST_IMAGE_BASE64,
      });

      // Verify storage upload was called
      expect(storage.upload).toHaveBeenCalledTimes(1);
      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringContaining('clients/client-1'),
        expect.any(Buffer),
        'image/png'
      );

      // Verify DB record was created
      expect(db.generatedAssets.create).toHaveBeenCalledTimes(1);
      expect(db.generatedAssets.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-1',
          prompt: 'A beautiful landscape',
          jobId: 'job-123',
        })
      );

      // Verify result
      expect(result.id).toBeDefined();
      expect(result.url).toContain('http://');
    });

    it('should include productId when provided', async () => {
      const { saveGeneratedImage } = await import('../../src/persistence');
      const { db } = await import('visualizer-db');

      await saveGeneratedImage({
        clientId: 'client-1',
        productId: 'product-456',
        prompt: 'Product image',
        jobId: 'job-456',
        base64Data: TEST_IMAGE_BASE64,
      });

      expect(db.generatedAssets.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productIds: ['product-456'],
        })
      );
    });

    it('should use flowId in storage path when provided', async () => {
      const { saveGeneratedImage } = await import('../../src/persistence');
      const { storage } = await import('visualizer-storage');

      await saveGeneratedImage({
        clientId: 'client-1',
        flowId: 'flow-789',
        prompt: 'Flow image',
        jobId: 'job-789',
        base64Data: TEST_IMAGE_BASE64,
      });

      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringContaining('flow-789'),
        expect.any(Buffer),
        expect.any(String)
      );
    });

    it('should include settings when provided', async () => {
      const { saveGeneratedImage } = await import('../../src/persistence');
      const { db } = await import('visualizer-db');

      const settings = { aspectRatio: '16:9', imageQuality: '2k' };

      await saveGeneratedImage({
        clientId: 'client-1',
        prompt: 'Image with settings',
        jobId: 'job-settings',
        base64Data: TEST_IMAGE_BASE64,
        settings,
      });

      expect(db.generatedAssets.create).toHaveBeenCalledWith(
        expect.objectContaining({
          settings,
        })
      );
    });
  });

  describe('saveGeneratedImages (batch)', () => {
    it('should save multiple images in batches', async () => {
      const { saveGeneratedImages } = await import('../../src/persistence');
      const { storage } = await import('visualizer-storage');

      const images = Array.from({ length: 7 }, (_, i) => ({
        clientId: 'client-1',
        prompt: `Image ${i}`,
        jobId: `job-${i}`,
        base64Data: TEST_IMAGE_BASE64,
      }));

      const results = await saveGeneratedImages(images);

      expect(results.length).toBe(7);
      expect(storage.upload).toHaveBeenCalledTimes(7);
    });

    it('should handle empty array', async () => {
      const { saveGeneratedImages } = await import('../../src/persistence');

      const results = await saveGeneratedImages([]);
      expect(results).toEqual([]);
    });
  });
});

describe('Filesystem Storage Integration', () => {
  const testDir = path.join(TEST_CONFIG.storage.rootDir, 'integration-test');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should write and read files correctly', async () => {
    const filePath = path.join(testDir, 'test-image.png');
    const base64 = TEST_IMAGE_BASE64;
    const matches = /^data:(.+);base64,(.+)$/.exec(base64)!;
    const buffer = Buffer.from(matches[2], 'base64');

    await fs.writeFile(filePath, buffer);
    const readBuffer = await fs.readFile(filePath);

    expect(readBuffer.equals(buffer)).toBe(true);
  });

  it('should create nested directories', async () => {
    const nestedPath = path.join(testDir, 'a', 'b', 'c', 'file.txt');
    await fs.mkdir(path.dirname(nestedPath), { recursive: true });
    await fs.writeFile(nestedPath, 'test');

    const content = await fs.readFile(nestedPath, 'utf8');
    expect(content).toBe('test');
  });

  it('should detect file existence', async () => {
    const filePath = path.join(testDir, 'exists.txt');

    // File doesn't exist
    try {
      await fs.access(filePath);
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      expect((err as NodeJS.ErrnoException).code).toBe('ENOENT');
    }

    // Create file
    await fs.writeFile(filePath, 'test');

    // File now exists
    await expect(fs.access(filePath)).resolves.not.toThrow();
  });
});

