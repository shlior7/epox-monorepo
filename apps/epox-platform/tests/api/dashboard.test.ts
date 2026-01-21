/**
 * Dashboard API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getDashboard } from '@/app/api/dashboard/route';

vi.mock('@/lib/services/db', () => ({
  db: {
    products: {
      count: vi.fn(),
    },
    collectionSessions: {
      count: vi.fn(),
      listRecent: vi.fn(),
    },
    generationFlows: {
      listByCollectionSessionIds: vi.fn(),
    },
    generatedAssets: {
      countByStatus: vi.fn(),
      countByGenerationFlowIds: vi.fn(),
      getFirstByGenerationFlowIds: vi.fn(),
    },
  },
}));

import { db } from '@/lib/services/db';

describe('Dashboard API - GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.products.count).mockResolvedValue(12);
    vi.mocked(db.collectionSessions.count).mockResolvedValue(3);
    vi.mocked(db.generatedAssets.countByStatus).mockResolvedValue(7);
    vi.mocked(db.collectionSessions.listRecent).mockResolvedValue([
      {
        id: 'coll-1',
        name: 'Living Room',
        status: 'completed',
        productIds: ['prod-1', 'prod-2'],
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
    ] as any);
    vi.mocked(db.generationFlows.listByCollectionSessionIds).mockResolvedValue([
      {
        id: 'flow-1',
        collectionSessionId: 'coll-1',
        productIds: ['prod-1'],
        status: 'completed',
        settings: {},
        selectedBaseImages: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ]);
    vi.mocked(db.generatedAssets.countByGenerationFlowIds)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4);
    vi.mocked(db.generatedAssets.getFirstByGenerationFlowIds).mockResolvedValue({
      assetUrl: 'https://cdn.example.com/assets/asset-1.jpg',
    } as any);
  });

  it('should return aggregated stats and recent collections', async () => {
    const response = await getDashboard(new NextRequest('http://localhost:3000/api/dashboard'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toEqual({
      totalProducts: 12,
      totalCollections: 3,
      totalGenerated: 7,
      creditsRemaining: 500,
    });
    expect(data.recentCollections).toHaveLength(1);
    expect(data.recentCollections[0]).toMatchObject({
      id: 'coll-1',
      productCount: 2,
      generatedCount: 4,
      totalImages: 6,
      thumbnailUrl: 'https://cdn.example.com/assets/asset-1.jpg',
    });
  });

  it('should handle errors', async () => {
    vi.mocked(db.products.count).mockRejectedValueOnce(new Error('DB down'));

    const response = await getDashboard(new NextRequest('http://localhost:3000/api/dashboard'));

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('DB down');
  });
});
