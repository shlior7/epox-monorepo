/**
 * Upload API Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST as upload } from '@/app/api/upload/route';

vi.mock('@/lib/services/storage', async () => {
  const { createTestStorage } = await import('visualizer-storage/testkit');
  const { storagePaths } = await import('visualizer-storage');
  const storage = createTestStorage({ rootDir: '.test-storage/api-upload' });
  return { storage, storagePaths };
});

vi.mock('@/lib/services/db', () => ({
  db: {
    productImages: {
      list: vi.fn(),
      create: vi.fn(),
    },
    products: {
      getById: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockGemini = {
  analyzeProductSubject: vi.fn(),
};

vi.mock('visualizer-ai', () => ({
  getGeminiService: vi.fn(() => mockGemini),
}));

import { storage } from '@/lib/services/storage';
import { db } from '@/lib/services/db';

function createFormRequest(formData: FormData): NextRequest {
  return {
    formData: async () => formData,
  } as NextRequest;
}

describe('Upload API - POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.productImages.list).mockResolvedValue([]);
    vi.mocked(db.productImages.create).mockResolvedValue({ id: 'img-1' } as any);
    vi.mocked(db.products.getById).mockResolvedValue({
      id: 'prod-1',
      analysisData: null,
    } as any);
    vi.mocked(db.products.update).mockResolvedValue({} as any);
    mockGemini.analyzeProductSubject.mockResolvedValue({
      subjectClassHyphenated: 'Dining-Chair',
      nativeSceneTypes: ['Living Room'],
      nativeSceneCategory: 'Indoor Room',
      inputCameraAngle: 'Frontal',
      dominantColors: ['brown'],
      materialTags: ['wood'],
    });
  });

  afterEach(async () => {
    const testStorage = storage as unknown as { cleanup: () => Promise<void> };
    await testStorage.cleanup();
  });

  it('should require a file', async () => {
    const formData = new FormData();
    const request = createFormRequest(formData);

    const response = await upload(request);

    expect(response.status).toBe(400);
  });

  it('should reject invalid file types', async () => {
    const formData = new FormData();
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    formData.set('file', file);

    const response = await upload(createFormRequest(formData));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid file type');
  });

  it('should reject oversized files', async () => {
    const formData = new FormData();
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });
    formData.set('file', file);

    const response = await upload(createFormRequest(formData));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('File too large');
  });

  it('should upload product image and create product image record', async () => {
    const formData = new FormData();
    const file = new File(['test'], 'chair.jpg', { type: 'image/jpeg' });
    formData.set('file', file);
    formData.set('type', 'product');
    formData.set('productId', 'prod-1');

    const response = await upload(createFormRequest(formData));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.productImageId).toBe('img-1');
    expect(data.key).toContain('clients/test-client/products/prod-1');
    expect(db.productImages.create).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({
        sortOrder: 0,
      })
    );
    expect(db.products.update).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({
        analysisVersion: '2.0',
        sceneTypes: ['Living Room'],
      })
    );
  });

  it('should continue when subject analysis fails', async () => {
    mockGemini.analyzeProductSubject.mockRejectedValueOnce(new Error('Scanner failed'));

    const formData = new FormData();
    const file = new File(['test'], 'chair.jpg', { type: 'image/jpeg' });
    formData.set('file', file);
    formData.set('type', 'product');
    formData.set('productId', 'prod-1');

    const response = await upload(createFormRequest(formData));

    expect(response.status).toBe(200);
    expect(db.products.update).not.toHaveBeenCalled();
  });

  it('should upload collection asset', async () => {
    const formData = new FormData();
    const file = new File(['test'], 'collection.jpg', { type: 'image/jpeg' });
    formData.set('file', file);
    formData.set('type', 'collection');
    formData.set('collectionId', 'coll-1');

    const response = await upload(createFormRequest(formData));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.key).toContain('clients/test-client/collections/coll-1/assets');
    expect(data.key).toContain('.jpg');
  });
});
