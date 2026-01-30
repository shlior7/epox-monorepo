/**
 * Collections API Tests
 * Tests CRUD operations for /api/collections and /api/collections/[id]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getCollections, POST as createCollection } from '@/app/api/collections/route';
import {
  GET as getCollection,
  PATCH as updateCollection,
  DELETE as deleteCollection,
} from '@/app/api/collections/[id]/route';
import { NextRequest } from 'next/server';

// Mock the db module with all required facade methods
vi.mock('@/lib/services/db', () => ({
  db: {
    collectionSessions: {
      list: vi.fn(),
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      listWithFilters: vi.fn(),
      countWithFilters: vi.fn(),
      // Optimized method with pre-aggregated stats
      listWithAssetStats: vi.fn(),
    },
    generationFlows: {
      create: vi.fn(),
      listByCollectionSessionIds: vi.fn(),
      listByCollectionSession: vi.fn(),
    },
    products: {
      listByIds: vi.fn(),
    },
    productImages: {
      list: vi.fn(),
    },
    productCategories: {
      listByProduct: vi.fn(),
    },
    categories: {
      getById: vi.fn(),
    },
    generatedAssets: {
      list: vi.fn(),
      countByGenerationFlowIds: vi.fn(),
      getFirstByGenerationFlowIds: vi.fn(),
      listByGenerationFlowIds: vi.fn(),
      deleteByGenerationFlowIds: vi.fn(),
      hardDelete: vi.fn(),
      // Optimized methods for batch operations
      listDeletableByFlowIds: vi.fn(),
      hardDeleteMany: vi.fn(),
    },
  },
}));

vi.mock('visualizer-storage', () => ({
  storage: {
    delete: vi.fn(),
  },
}));

import { db } from '@/lib/services/db';
import { storage } from 'visualizer-storage';

describe('Collections API - GET /api/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks for list endpoint - now uses optimized listWithAssetStats
    vi.mocked(db.collectionSessions.countWithFilters).mockResolvedValue(0);
    vi.mocked(db.collectionSessions.listWithAssetStats).mockResolvedValue([]);
  });

  it('should return empty list when no collections exist', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections');
    const response = await getCollections(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.collections).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('should validate pagination parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections?page=0');
    const response = await getCollections(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid pagination');
  });

  it('should filter by status', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections?status=completed');
    await getCollections(request);

    expect(db.collectionSessions.listWithAssetStats).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('should search by name', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections?search=living room');
    await getCollections(request);

    expect(db.collectionSessions.listWithAssetStats).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ search: 'living room' })
    );
  });

  it('should sort by name', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections?sort=name');
    await getCollections(request);

    expect(db.collectionSessions.listWithAssetStats).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ sort: 'name' })
    );
  });

  it('should sort by productCount', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections?sort=productCount');
    await getCollections(request);

    expect(db.collectionSessions.listWithAssetStats).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ sort: 'productCount' })
    );
  });
});

describe('Collections API - POST /api/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.generationFlows.create).mockResolvedValue({
      id: 'flow-1',
      collectionSessionId: 'coll-1',
      productIds: ['prod-1'],
      status: 'draft',
      settings: {},
      selectedBaseImages: {},
      updatedAt: new Date(),
    } as any);
    // Mock products.listByIds (used to get selectedSceneType for each product)
    vi.mocked(db.products.listByIds).mockResolvedValue([]);
    // Mock productImages.list (used to get thumbnails)
    vi.mocked(db.productImages.list).mockResolvedValue([]);
  });

  it('should create a new collection with valid data', async () => {
    const mockCollection = {
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Living Room Collection',
      productIds: ['prod-1', 'prod-2'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.collectionSessions.create).mockResolvedValue(mockCollection);

    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Living Room Collection',
        productIds: ['prod-1', 'prod-2'],
      }),
    });

    const response = await createCollection(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Living Room Collection');
    expect(data.productIds).toHaveLength(2);
    expect(data.status).toBe('draft');
  });

  it('should reject empty name', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: '',
        productIds: ['prod-1'],
      }),
    });

    const response = await createCollection(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Name');
  });

  it('should reject name longer than 255 characters', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'a'.repeat(256),
        productIds: ['prod-1'],
      }),
    });

    const response = await createCollection(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('255 characters');
  });

  it('should reject empty productIds', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Collection',
        productIds: [],
      }),
    });

    const response = await createCollection(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('productIds must be a non-empty array');
  });

  it('should reject non-array productIds', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Collection',
        productIds: 'invalid',
      }),
    });

    const response = await createCollection(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('productIds must be a non-empty array');
  });

  it('should reject non-string productIds', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Collection',
        productIds: [123, 456],
      }),
    });

    const response = await createCollection(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('All productIds must be strings');
  });

  it('should auto-populate inspirationSections from category defaults', async () => {
    const mockCollection = {
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Auto-populated Collection',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.collectionSessions.create).mockResolvedValue(mockCollection);
    vi.mocked(db.products.listByIds).mockResolvedValue([]);
    vi.mocked(db.productImages.list).mockResolvedValue([]);

    // Product has a category link
    vi.mocked(db.productCategories.listByProduct).mockResolvedValue([
      { productId: 'prod-1', categoryId: 'cat-1' } as any,
    ]);

    // Category has default bubbles
    vi.mocked(db.categories.getById).mockResolvedValue({
      id: 'cat-1',
      name: 'Ladders',
      clientId: 'test-client',
      generationSettings: {
        defaultBubbles: [
          { type: 'style', preset: 'Industrial' },
          { type: 'lighting', preset: 'Studio Light' },
        ],
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Auto-populated Collection',
        productIds: ['prod-1'],
      }),
    });

    const response = await createCollection(request);
    expect(response.status).toBe(201);

    // Verify collection was created with auto-populated settings
    const createCall = vi.mocked(db.collectionSessions.create).mock.calls[0];
    const settingsArg = createCall[1].settings as any;

    expect(settingsArg).toBeDefined();
    expect(settingsArg.inspirationSections).toHaveLength(1);
    expect(settingsArg.inspirationSections[0].categoryIds).toEqual(['cat-1']);
    expect(settingsArg.inspirationSections[0].bubbles).toHaveLength(2);
    expect(settingsArg.inspirationSections[0].bubbles[0]).toEqual({ type: 'style', preset: 'Industrial' });
    expect(settingsArg.inspirationSections[0].enabled).toBe(true);
  });

  it('should not auto-populate sections for categories without defaultBubbles', async () => {
    const mockCollection = {
      id: 'coll-1',
      clientId: 'test-client',
      name: 'No Defaults Collection',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.collectionSessions.create).mockResolvedValue(mockCollection);
    vi.mocked(db.products.listByIds).mockResolvedValue([]);
    vi.mocked(db.productImages.list).mockResolvedValue([]);

    vi.mocked(db.productCategories.listByProduct).mockResolvedValue([
      { productId: 'prod-1', categoryId: 'cat-1' } as any,
    ]);

    // Category has no default bubbles
    vi.mocked(db.categories.getById).mockResolvedValue({
      id: 'cat-1',
      name: 'Unconfigured',
      clientId: 'test-client',
      generationSettings: null,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'No Defaults Collection',
        productIds: ['prod-1'],
      }),
    });

    const response = await createCollection(request);
    expect(response.status).toBe(201);

    // Settings should be undefined (no sections to auto-populate, no inspiration images)
    const createCall = vi.mocked(db.collectionSessions.create).mock.calls[0];
    const settingsArg = createCall[1].settings;
    expect(settingsArg).toBeUndefined();
  });

  it('should deduplicate categories across multiple products', async () => {
    const mockCollection = {
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Multi-product',
      productIds: ['prod-1', 'prod-2'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.collectionSessions.create).mockResolvedValue(mockCollection);
    vi.mocked(db.products.listByIds).mockResolvedValue([]);
    vi.mocked(db.productImages.list).mockResolvedValue([]);

    // Both products share the same category
    vi.mocked(db.productCategories.listByProduct)
      .mockResolvedValueOnce([{ productId: 'prod-1', categoryId: 'cat-1' } as any])
      .mockResolvedValueOnce([{ productId: 'prod-2', categoryId: 'cat-1' } as any]);

    vi.mocked(db.categories.getById).mockResolvedValue({
      id: 'cat-1',
      name: 'Shared Category',
      clientId: 'test-client',
      generationSettings: {
        defaultBubbles: [{ type: 'style', preset: 'Modern' }],
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Multi-product',
        productIds: ['prod-1', 'prod-2'],
      }),
    });

    const response = await createCollection(request);
    expect(response.status).toBe(201);

    // Should only create ONE section despite both products sharing the category
    const createCall = vi.mocked(db.collectionSessions.create).mock.calls[0];
    const settingsArg = createCall[1].settings as any;
    expect(settingsArg.inspirationSections).toHaveLength(1);
  });
});

describe('Collections API - GET /api/collections/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([]);
    vi.mocked(db.generatedAssets.countByGenerationFlowIds).mockResolvedValue(0);
  });

  it('should return collection with stats', async () => {
    const mockCollection = {
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Living Room Collection',
      productIds: ['prod-1', 'prod-2'],
      selectedBaseImages: {},
      settings: null,
      status: 'completed' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.collectionSessions.getById).mockResolvedValue(mockCollection);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1');
    const response = await getCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Living Room Collection');
    expect(data.productCount).toBe(2);
    expect(data.status).toBe('completed');
  });

  it('should return 404 for non-existent collection', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/collections/invalid-id');
    const response = await getCollection(request, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Collection not found');
  });
});

describe('Collections API - PATCH /api/collections/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update collection name', async () => {
    const existingCollection = {
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Old Name',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedCollection = {
      ...existingCollection,
      name: 'New Name',
      updatedAt: new Date(),
    };

    vi.mocked(db.collectionSessions.getById).mockResolvedValue(existingCollection);
    vi.mocked(db.collectionSessions.update).mockResolvedValue(updatedCollection);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await updateCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('New Name');
  });

  it('should update collection status', async () => {
    const existingCollection = {
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Test Collection',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedCollection = {
      ...existingCollection,
      status: 'generating' as const,
      updatedAt: new Date(),
    };

    vi.mocked(db.collectionSessions.getById).mockResolvedValue(existingCollection);
    vi.mocked(db.collectionSessions.update).mockResolvedValue(updatedCollection);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'generating' }),
    });

    const response = await updateCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('generating');
  });

  it('should update collection settings with video config', async () => {
    const existingCollection = {
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Test Collection',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedCollection = {
      ...existingCollection,
      settings: {
        inspirationImages: [],
        aspectRatio: '16:9' as const,
        video: {
          prompt: 'Slow orbit around the sofa',
          inspirationImageUrl: 'https://example.com/inspo.jpg',
          inspirationNote: 'Warm studio mood',
          settings: {
            videoType: 'orbit',
            cameraMotion: 'orbit',
            durationSeconds: 6,
          },
          presetId: 'preset-1',
        },
      },
      updatedAt: new Date(),
    };

    vi.mocked(db.collectionSessions.getById).mockResolvedValue(existingCollection);
    vi.mocked(db.collectionSessions.update).mockResolvedValue(updatedCollection);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1', {
      method: 'PATCH',
      body: JSON.stringify({
        settings: {
          video: {
            prompt: 'Slow orbit around the sofa',
            inspirationImageUrl: 'https://example.com/inspo.jpg',
            inspirationNote: 'Warm studio mood',
            settings: {
              videoType: 'orbit',
              cameraMotion: 'orbit',
              durationSeconds: 6,
            },
            presetId: 'preset-1',
          },
        },
      }),
    });

    const response = await updateCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(db.collectionSessions.update).toHaveBeenCalledWith(
      'coll-1',
      expect.objectContaining({
        settings: expect.objectContaining({
          video: expect.objectContaining({
            prompt: 'Slow orbit around the sofa',
          }),
        }),
      })
    );
    expect(data.settings.video.prompt).toBe('Slow orbit around the sofa');
  });

  it('should reject invalid status', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Test',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid-status' }),
    });

    const response = await updateCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Status must be one of');
  });

  it('should return 404 for non-existent collection', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/collections/invalid-id', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await updateCollection(request, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });

    expect(response.status).toBe(404);
  });
});

describe('Collections API - DELETE /api/collections/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete existing collection', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Test',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
      {
        id: 'flow-1',
        collectionSessionId: 'coll-1',
        productIds: ['prod-1'],
        status: 'completed',
        settings: {},
        selectedBaseImages: {},
        updatedAt: new Date(),
      } as any,
    ]);
    vi.mocked(db.generatedAssets.listByGenerationFlowIds).mockResolvedValue([
      {
        id: 'asset-1',
        assetUrl: 'https://cdn.example.com/path/to/file.png',
        pinned: false,
        approvalStatus: 'pending',
        deletedAt: null,
      } as any,
    ]);
    vi.mocked(db.collectionSessions.delete).mockResolvedValue();
    vi.mocked(db.generatedAssets.deleteByGenerationFlowIds).mockResolvedValue();

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1', {
      method: 'DELETE',
      body: JSON.stringify({ assetPolicy: 'delete_all' }),
    });

    const response = await deleteCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBe('coll-1');
    expect(db.generatedAssets.deleteByGenerationFlowIds).toHaveBeenCalledWith(['flow-1']);
    expect(storage.delete).toHaveBeenCalledWith('path/to/file.png');
  });

  it('should keep pinned and approved assets when policy is keep_pinned_approved', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      clientId: 'test-client',
      name: 'Test',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: null,
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
      {
        id: 'flow-1',
        collectionSessionId: 'coll-1',
        productIds: ['prod-1'],
        status: 'completed',
        settings: {},
        selectedBaseImages: {},
        updatedAt: new Date(),
      } as any,
    ]);
    // Now uses SQL-level filtering via listDeletableByFlowIds instead of JS filtering
    vi.mocked(db.generatedAssets.listDeletableByFlowIds).mockResolvedValue([
      {
        id: 'asset-delete',
        assetUrl: 'https://cdn.example.com/delete.png',
        pinned: false,
        approvalStatus: 'pending',
        deletedAt: null,
      } as any,
    ]);
    vi.mocked(db.collectionSessions.delete).mockResolvedValue();
    vi.mocked(db.generatedAssets.hardDeleteMany).mockResolvedValue();

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1', {
      method: 'DELETE',
      body: JSON.stringify({ assetPolicy: 'keep_pinned_approved' }),
    });

    const response = await deleteCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Now uses batch delete
    expect(db.generatedAssets.hardDeleteMany).toHaveBeenCalledWith(['asset-delete']);
    expect(storage.delete).toHaveBeenCalledWith('delete.png');
  });

  it('should return 404 for non-existent collection', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/collections/invalid-id', {
      method: 'DELETE',
    });

    const response = await deleteCollection(request, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });

    expect(response.status).toBe(404);
  });
});
