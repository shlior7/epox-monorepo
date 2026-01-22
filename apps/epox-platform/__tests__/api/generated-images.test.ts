/**
 * Generated Images API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  GET as getGeneratedImages,
  DELETE as deleteGeneratedImage,
} from '@/app/api/generated-images/route';

vi.mock('@/lib/services/db', () => ({
  db: {
    generatedAssets: {
      listByGenerationFlow: vi.fn(),
      countWithFilters: vi.fn(),
      listWithFilters: vi.fn(),
      // Optimized flow-specific methods
      countByFlowWithFilters: vi.fn(),
      listByFlowWithFilters: vi.fn(),
      getDistinctSceneTypes: vi.fn(),
      getById: vi.fn(),
      hardDelete: vi.fn(),
    },
    products: {
      getNamesByIds: vi.fn(),
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

describe('Generated Images API - GET /api/generated-images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.generatedAssets.getDistinctSceneTypes).mockResolvedValue([]);
  });

  it('should validate pagination parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/generated-images?page=0');
    const response = await getGeneratedImages(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid pagination');
  });

  it('should filter and sort by flowId', async () => {
    // With flowId, the API now uses SQL-level filtering via the optimized methods
    const filteredAssets = [
      {
        id: 'asset-1',
        assetUrl: 'https://cdn.example.com/a1.jpg',
        assetType: 'image',
        productIds: ['prod-1'],
        status: 'completed',
        approvalStatus: 'approved',
        pinned: true,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        settings: {},
      },
      {
        id: 'asset-2',
        assetUrl: 'https://cdn.example.com/a2.jpg',
        assetType: 'image',
        productIds: ['prod-2'],
        status: 'completed',
        approvalStatus: 'approved',
        pinned: true,
        createdAt: new Date('2025-01-02T00:00:00Z'),
        settings: {},
      },
    ];

    vi.mocked(db.generatedAssets.countByFlowWithFilters).mockResolvedValue(2);
    vi.mocked(db.generatedAssets.listByFlowWithFilters).mockResolvedValue(filteredAssets as any);
    vi.mocked(db.products.getNamesByIds).mockResolvedValue(
      new Map([
        ['prod-1', 'Chair'],
        ['prod-2', 'Sofa'],
      ])
    );

    const request = new NextRequest(
      'http://localhost:3000/api/generated-images?flowId=flow-1&status=completed&approval=approved&pinned=true&sort=oldest&limit=5&page=1'
    );
    const response = await getGeneratedImages(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(db.generatedAssets.listByFlowWithFilters).toHaveBeenCalledWith(
      'flow-1',
      expect.objectContaining({
        status: 'completed',
        approvalStatus: 'approved',
        pinned: true,
        sort: 'oldest',
      })
    );
    expect(data.images).toHaveLength(2);
    expect(data.images[0]).toMatchObject({
      id: 'asset-1',
      productName: 'Chair',
    });
    expect(data.images[1]).toMatchObject({
      id: 'asset-2',
      productName: 'Sofa',
    });
  });

  it('should return paginated assets with filters', async () => {
    vi.mocked(db.generatedAssets.countWithFilters).mockResolvedValue(1);
    vi.mocked(db.generatedAssets.listWithFilters).mockResolvedValue([
      {
        id: 'asset-1',
        assetUrl: 'https://cdn.example.com/a1.jpg',
        assetType: 'image',
        productIds: ['prod-1'],
        status: 'completed',
        approvalStatus: 'pending',
        pinned: false,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        settings: { aspectRatio: '1:1', imageQuality: '2k' },
        chatSessionId: 'chat-1',
        generationFlowId: null,
      },
    ] as any);
    vi.mocked(db.products.getNamesByIds).mockResolvedValue(new Map([['prod-1', 'Chair']]));

    const request = new NextRequest(
      'http://localhost:3000/api/generated-images?status=completed&approval=pending&sort=date&limit=5&page=1'
    );
    const response = await getGeneratedImages(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.images[0]).toMatchObject({
      id: 'asset-1',
      productName: 'Chair',
      approvalStatus: 'pending',
      assetType: 'image',
    });
  });

  it('should filter by productIds', async () => {
    vi.mocked(db.generatedAssets.countWithFilters).mockResolvedValue(2);
    vi.mocked(db.generatedAssets.listWithFilters).mockResolvedValue([
      {
        id: 'asset-1',
        assetUrl: 'https://cdn.example.com/a1.jpg',
        assetType: 'image',
        productIds: ['prod-1'],
        status: 'completed',
        approvalStatus: 'pending',
        pinned: false,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        settings: { aspectRatio: '1:1', imageQuality: '2k' },
        chatSessionId: 'chat-1',
        generationFlowId: null,
      },
    ] as any);
    vi.mocked(db.products.getNamesByIds).mockResolvedValue(new Map([['prod-1', 'Chair']]));

    const request = new NextRequest(
      'http://localhost:3000/api/generated-images?productIds=prod-1,prod-2&sort=date&limit=5&page=1'
    );
    const response = await getGeneratedImages(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(db.generatedAssets.listWithFilters).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ productIds: ['prod-1', 'prod-2'] })
    );
    expect(data.images[0]).toMatchObject({
      id: 'asset-1',
      productName: 'Chair',
    });
  });

  it('should include assetType for flow assets', async () => {
    vi.mocked(db.generatedAssets.countByFlowWithFilters).mockResolvedValue(1);
    vi.mocked(db.generatedAssets.listByFlowWithFilters).mockResolvedValue([
      {
        id: 'asset-vid-1',
        assetUrl: 'https://cdn.example.com/v1.mp4',
        assetType: 'video',
        productIds: ['prod-1'],
        status: 'completed',
        approvalStatus: 'approved',
        pinned: false,
        createdAt: new Date('2025-01-02T00:00:00Z'),
        settings: {},
      },
    ] as any);
    vi.mocked(db.products.getNamesByIds).mockResolvedValue(new Map([['prod-1', 'Chair']]));

    const request = new NextRequest('http://localhost:3000/api/generated-images?flowId=flow-1');
    const response = await getGeneratedImages(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.images[0]).toMatchObject({
      id: 'asset-vid-1',
      assetType: 'video',
    });
  });

  it('should handle errors', async () => {
    vi.mocked(db.generatedAssets.countWithFilters).mockRejectedValueOnce(new Error('DB down'));

    const request = new NextRequest('http://localhost:3000/api/generated-images');
    const response = await getGeneratedImages(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('DB down');
  });
});

describe('Generated Images API - DELETE /api/generated-images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require id', async () => {
    const request = new NextRequest('http://localhost:3000/api/generated-images', {
      method: 'DELETE',
      body: JSON.stringify({}),
    });

    const response = await deleteGeneratedImage(request);

    expect(response.status).toBe(400);
  });

  it('should return 404 when asset not found', async () => {
    vi.mocked(db.generatedAssets.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/generated-images', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'missing' }),
    });

    const response = await deleteGeneratedImage(request);

    expect(response.status).toBe(404);
  });

  it('should delete asset and storage object', async () => {
    vi.mocked(db.generatedAssets.getById).mockResolvedValue({
      id: 'asset-1',
      clientId: 'test-client',
      assetUrl: 'https://cdn.example.com/path/to/file.png',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/generated-images', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'asset-1' }),
    });

    const response = await deleteGeneratedImage(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(db.generatedAssets.hardDelete).toHaveBeenCalledWith('asset-1');
    expect(storage.delete).toHaveBeenCalledWith('path/to/file.png');
    expect(data.success).toBe(true);
  });

  it('should succeed even if storage deletion fails', async () => {
    vi.mocked(db.generatedAssets.getById).mockResolvedValue({
      id: 'asset-1',
      clientId: 'test-client',
      assetUrl: 'https://cdn.example.com/path/to/file.png',
    } as any);
    vi.mocked(storage.delete).mockRejectedValueOnce(new Error('Storage failed'));

    const request = new NextRequest('http://localhost:3000/api/generated-images', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'asset-1' }),
    });

    const response = await deleteGeneratedImage(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
