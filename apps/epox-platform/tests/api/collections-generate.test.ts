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
      create: vi.fn(),
      update: vi.fn(),
    },
    products: {
      getById: vi.fn(),
    },
    productImages: {
      list: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/get-auth', () => ({
  getClientId: vi.fn(() => Promise.resolve('client-1')),
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
  });

  it('should return 404 when collection not found', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await generateCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });

    expect(response.status).toBe(404);
  });

  it('should reject when no products to generate', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: {},
    } as any);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
      method: 'POST',
      body: JSON.stringify({ productIds: ['prod-2'] }),
    });

    const response = await generateCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('No products to generate');
  });

  it('should create flows and generation job', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: {
        inspirationImages: [{ url: 'https://example.com/inspo.jpg' }],
        aspectRatio: '1:1',
        imageQuality: '2k',
        variantsCount: 1,
      },
    } as any);
    vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([] as any);
    vi.mocked(db.generationFlows.create).mockResolvedValue({ id: 'flow-1' } as any);
    vi.mocked(db.products.getById).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(db.productImages.list).mockResolvedValue([
      { id: 'img-1', r2KeyBase: 'clients/test-client/products/prod-1/img-1.jpg' },
    ] as any);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
      method: 'POST',
      body: JSON.stringify({
        settings: {
          imageQuality: '4k',
          variantsCount: 2,
        },
      }),
    });

    const response = await generateCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(enqueueImageGeneration).toHaveBeenCalledWith(
      'client-1',
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
    expect(data.jobId).toBe('job-1');
  });

  it('should update existing flows with new settings', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      productIds: ['prod-1'],
      selectedBaseImages: {},
      settings: {},
    } as any);
    vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
      { id: 'flow-1', productIds: ['prod-1'] },
    ] as any);
    vi.mocked(db.generationFlows.update).mockResolvedValue({ id: 'flow-1' } as any);
    vi.mocked(db.products.getById).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(db.productImages.list).mockResolvedValue([
      { id: 'img-1', r2KeyBase: 'clients/test-client/products/prod-1/img-1.jpg' },
    ] as any);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
      method: 'POST',
      body: JSON.stringify({ settings: { aspectRatio: '4:3' } }),
    });

    const response = await generateCollection(request, { params: Promise.resolve({ id: 'coll-1' }) });

    expect(response.status).toBe(200);
    expect(db.generationFlows.update).toHaveBeenCalledWith('flow-1',
      expect.objectContaining({
        settings: expect.objectContaining({ aspectRatio: '4:3' }),
      })
    );
  });
});
