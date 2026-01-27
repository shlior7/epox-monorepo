/**
 * Collection Flows API Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getFlows, POST as createFlows } from '@/app/api/collections/[id]/flows/route';

vi.mock('@/lib/services/db', () => ({
  db: {
    collectionSessions: {
      getById: vi.fn(),
    },
    generationFlows: {
      listByCollectionSession: vi.fn(),
      listByCollectionSessionWithDetails: vi.fn(),
      create: vi.fn(),
    },
    generatedAssets: {
      listByGenerationFlowIds: vi.fn(),
    },
    products: {
      getById: vi.fn(),
      getByIds: vi.fn(),
    },
    productImages: {
      list: vi.fn(),
      listByProductIds: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/get-auth', () => ({
  getClientId: vi.fn(() => Promise.resolve('test-client')),
}));

import { db } from '@/lib/services/db';

describe('Collection Flows API - GET /api/collections/[id]/flows', () => {
  const originalR2 = process.env.R2_PUBLIC_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
  });

  afterEach(() => {
    process.env.R2_PUBLIC_URL = originalR2;
  });

  it('should return 404 when collection not found', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/flows');
    const response = await getFlows(request, { params: Promise.resolve({ id: 'coll-1' }) });

    expect(response.status).toBe(404);
  });

  it('should return flows with mapped assets and base images', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      clientId: 'test-client',
      productIds: ['prod-1', 'prod-2'],
    } as any);
    // Mock the new listByCollectionSessionWithDetails method
    vi.mocked(db.generationFlows.listByCollectionSessionWithDetails).mockResolvedValue([
      {
        id: 'flow-1',
        productIds: ['prod-1'],
        status: 'draft',
        settings: {},
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        product: {
          id: 'prod-1',
          name: 'Chair',
          category: 'Chairs',
          sceneTypes: ['Living Room'],
        },
        baseImages: [{ url: 'https://cdn.example.com/products/prod-1/img-1.jpg' }],
        generatedAssets: [
          {
            id: 'asset-1',
            generationFlowId: 'flow-1',
            assetUrl: 'https://cdn.example.com/asset-1.jpg',
            assetType: 'image',
            status: 'completed',
            approvalStatus: 'approved',
            createdAt: new Date('2025-01-02T00:00:00Z'),
          },
        ],
      },
      {
        id: 'flow-2',
        productIds: ['prod-2'],
        status: 'draft',
        settings: {},
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        product: {
          id: 'prod-2',
          name: 'Sofa',
          category: 'Sofas',
          sceneTypes: ['Bedroom'],
        },
        baseImages: [],
        generatedAssets: [],
      },
    ] as any);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/flows');
    const response = await getFlows(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.flows).toHaveLength(2);
    expect(data.flows[0].status).toBe('completed');
    expect(data.flows[0].baseImages[0].url).toContain('https://cdn.example.com');
    expect(data.flows[0].generatedImages).toHaveLength(1);
  });
});

describe('Collection Flows API - POST /api/collections/[id]/flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 when collection not found', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/flows', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await createFlows(request, { params: Promise.resolve({ id: 'coll-1' }) });

    expect(response.status).toBe(404);
  });

  it('should create missing flows and reuse existing ones', async () => {
    vi.mocked(db.collectionSessions.getById).mockResolvedValue({
      id: 'coll-1',
      clientId: 'test-client',
      productIds: ['prod-1', 'prod-2'],
      selectedBaseImages: {},
      settings: {
        inspirationImages: [{ url: 'https://example.com/default.jpg' }],
        sceneTypeInspirations: {
          'Living Room': {
            inspirationImages: [{ url: 'https://example.com/living.jpg' }],
            mergedAnalysis: {
              json: {
                styleSummary: 'Modern',
                detectedSceneType: 'Living Room',
                heroObjectAccessories: null,
                sceneInventory: [],
                lightingPhysics: {
                  sourceDirection: 'left',
                  shadowQuality: 'soft',
                  colorTemperature: 'warm',
                },
              },
              promptText: 'Modern',
            },
          },
        },
      },
    } as any);
    vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
      { id: 'flow-1', productIds: ['prod-1'] },
    ] as any);
    // Now uses batch methods for N+1 elimination
    vi.mocked(db.products.getByIds).mockResolvedValue(
      new Map([
        [
          'prod-2',
          {
            id: 'prod-2',
            sceneTypes: ['Living Room'],
          },
        ],
      ]) as any
    );
    vi.mocked(db.generationFlows.create).mockResolvedValue({ id: 'flow-2' } as any);

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/flows', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await createFlows(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(db.generationFlows.create).toHaveBeenCalledTimes(1);
    expect(db.generationFlows.create).toHaveBeenCalledWith(
      'test-client',
      expect.objectContaining({
        productIds: ['prod-2'],
        collectionSessionId: 'coll-1',
      })
    );
    expect(data.created).toBe(1);
    expect(data.total).toBe(2);
  });
});
