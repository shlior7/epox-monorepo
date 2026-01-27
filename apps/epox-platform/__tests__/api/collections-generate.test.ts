/**
 * Collection Generate API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as generateCollection } from '@/app/api/collections/[id]/generate/route';

vi.mock('visualizer-ai', () => ({
  enqueueImageGeneration: vi.fn(),
}));

vi.mock('@/lib/services/db', () => ({
  db: {
    collectionSessions: {
      getById: vi.fn(),
      update: vi.fn(),
    },
    generationFlows: {
      listByCollectionSession: vi.fn(),
    },
    productImages: {
      listByProductIds: vi.fn(),
    },
    generatedAssets: {
      create: vi.fn(),
    },
  },
}));

import { db } from '@/lib/services/db';
import { enqueueImageGeneration } from 'visualizer-ai';

describe('Collection Generate API - POST /api/collections/[id]/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enqueueImageGeneration).mockResolvedValue({
      jobId: 'job-1',
      expectedImageIds: [],
    });
    vi.mocked(db.generatedAssets.create).mockResolvedValue({ id: 'asset-1' } as any);
  });

  it('should return 404 when collection not found', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await generateCollection(request, {
      params: Promise.resolve({ id: 'coll-1' }),
    });

    expect(response.status).toBe(404);
  });

  it('should return 403 when client does not own collection', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      clientId: 'other-client',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: {},
    } as any);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await generateCollection(request, {
      params: Promise.resolve({ id: 'coll-1' }),
    });

    expect(response.status).toBe(403);
  });

  it('should create generation jobs for each flow', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      clientId: 'test-client',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: {
        inspirationImages: [{ url: 'https://example.com/inspo.jpg' }],
        aspectRatio: '1:1',
        imageQuality: '2k',
        variantsCount: 1,
      },
    } as any);
    vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
      { id: 'flow-1', productIds: ['prod-1'], selectedBaseImages: {} },
    ] as any);
    vi.mocked(db.productImages.listByProductIds).mockResolvedValue(
      new Map([
        ['prod-1', [{ id: 'img-1', imageUrl: 'clients/test-client/products/prod-1/img-1.jpg', isPrimary: true }]],
      ]) as any
    );

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
      method: 'POST',
      body: JSON.stringify({
        settings: {
          imageQuality: '4k',
          variantsCount: 2,
        },
      }),
    });

    const response = await generateCollection(request, {
      params: Promise.resolve({ id: 'coll-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(enqueueImageGeneration).toHaveBeenCalledWith(
      'test-client',
      expect.objectContaining({
        sessionId: 'flow-1',
        productIds: ['prod-1'],
        settings: expect.objectContaining({
          imageQuality: '4k',
          numberOfVariants: 2,
        }),
      }),
      expect.objectContaining({
        flowId: 'flow-1',
        priority: 100,
      })
    );
    expect(db.collectionSessions.update).toHaveBeenCalledWith('coll-1', { status: 'generating' });
    expect(db.generatedAssets.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'test-client',
        generationFlowId: 'flow-1',
        status: 'pending',
        jobId: 'job-1',
      })
    );
    expect(data.jobIds).toEqual(['job-1']);
    expect(data.flowIds).toEqual(['flow-1']);
  });

  it('should handle multiple flows', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      clientId: 'test-client',
      productIds: ['prod-1', 'prod-2'],
      selectedBaseImages: {},
      settings: {},
    } as any);
    vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
      { id: 'flow-1', productIds: ['prod-1'], selectedBaseImages: {} },
      { id: 'flow-2', productIds: ['prod-2'], selectedBaseImages: {} },
    ] as any);
    vi.mocked(db.productImages.listByProductIds).mockResolvedValue(new Map() as any);
    vi.mocked(enqueueImageGeneration)
      .mockResolvedValueOnce({ jobId: 'job-1', expectedImageIds: [] })
      .mockResolvedValueOnce({ jobId: 'job-2', expectedImageIds: [] });

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await generateCollection(request, {
      params: Promise.resolve({ id: 'coll-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(enqueueImageGeneration).toHaveBeenCalledTimes(2);
    expect(data.jobIds).toEqual(['job-1', 'job-2']);
    expect(data.flowIds).toEqual(['flow-1', 'flow-2']);
  });

  it('should use selected base images from flow', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      clientId: 'test-client',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: {},
    } as any);
    vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
      {
        id: 'flow-1',
        productIds: ['prod-1'],
        selectedBaseImages: { 'prod-1': 'https://storage.example.com/custom-image.jpg' },
      },
    ] as any);
    vi.mocked(db.productImages.listByProductIds).mockResolvedValue(new Map() as any);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await generateCollection(request, {
      params: Promise.resolve({ id: 'coll-1' }),
    });

    expect(response.status).toBe(200);
    expect(enqueueImageGeneration).toHaveBeenCalledWith(
      'test-client',
      expect.objectContaining({
        productImageUrls: ['https://storage.example.com/custom-image.jpg'],
      }),
      expect.any(Object)
    );
  });
});
