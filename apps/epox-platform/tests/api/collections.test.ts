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
    },
    generatedAssets: {
      list: vi.fn(),
    },
  },
}));

import { db } from '@/lib/services/db';

describe('Collections API - GET /api/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks for list endpoint
    vi.mocked(db.collectionSessions.countWithFilters).mockResolvedValue(0);
    vi.mocked(db.collectionSessions.listWithFilters).mockResolvedValue([]);
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

    expect(db.collectionSessions.listWithFilters).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('should search by name', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections?search=living room');
    await getCollections(request);

    expect(db.collectionSessions.listWithFilters).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ search: 'living room' })
    );
  });

  it('should sort by name', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections?sort=name');
    await getCollections(request);

    expect(db.collectionSessions.listWithFilters).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ sort: 'name' })
    );
  });

  it('should sort by productCount', async () => {
    const request = new NextRequest('http://localhost:3000/api/collections?sort=productCount');
    await getCollections(request);

    expect(db.collectionSessions.listWithFilters).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ sort: 'productCount' })
    );
  });
});

describe('Collections API - POST /api/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new collection with valid data', async () => {
    const mockCollection = {
      id: 'coll-1',
      clientId: 'demo-client',
      name: 'Living Room Collection',
      productIds: ['prod-1', 'prod-2'],
      selectedBaseImages: {},
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
});

describe('Collections API - GET /api/collections/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return collection with stats', async () => {
    const mockCollection = {
      id: 'coll-1',
      clientId: 'demo-client',
      name: 'Living Room Collection',
      productIds: ['prod-1', 'prod-2'],
      selectedBaseImages: {},
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
      clientId: 'demo-client',
      name: 'Old Name',
      productIds: ['prod-1'],
      selectedBaseImages: {},
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
      clientId: 'demo-client',
      name: 'Test Collection',
      productIds: ['prod-1'],
      selectedBaseImages: {},
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
      clientId: 'demo-client',
      name: 'Test Collection',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: {},
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedCollection = {
      ...existingCollection,
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
      clientId: 'demo-client',
      name: 'Test',
      productIds: ['prod-1'],
      selectedBaseImages: {},
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
      clientId: 'demo-client',
      name: 'Test',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      status: 'draft' as const,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.collectionSessions.delete).mockResolvedValue();

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1', {
      method: 'DELETE',
    });

    const response = await deleteCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBe('coll-1');
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
