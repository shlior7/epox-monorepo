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
      getByIds: vi.fn(),
    },
    collectionSessions: {
      count: vi.fn(),
      listRecent: vi.fn(),
      listWithAssetStats: vi.fn(),
    },
    generationFlows: {
      listByCollectionSessionIds: vi.fn(),
    },
    generatedAssets: {
      countByStatus: vi.fn(),
      countByGenerationFlowIds: vi.fn(),
      getFirstByGenerationFlowIds: vi.fn(),
      listWithFilters: vi.fn(),
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
    // Use listWithAssetStats which returns collections with pre-aggregated stats
    vi.mocked(db.collectionSessions.listWithAssetStats).mockResolvedValue([
      {
        id: 'coll-1',
        name: 'Living Room',
        status: 'completed',
        productIds: ['prod-1', 'prod-2'],
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        // Pre-aggregated stats from optimized query
        totalImages: 6,
        completedCount: 4,
        thumbnails: ['https://cdn.example.com/assets/asset-1.jpg'],
      },
    ] as any);
    // Mock recent generated assets
    vi.mocked(db.generatedAssets.listWithFilters).mockResolvedValue([]);
    vi.mocked(db.products.getByIds).mockResolvedValue(new Map());
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
      thumbnails: expect.arrayContaining(['https://cdn.example.com/assets/asset-1.jpg']),
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
