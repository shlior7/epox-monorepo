/**
 * Studio Session API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createStudio, GET as listStudios } from '@/app/api/studio/route';

vi.mock('@/lib/services/db', () => ({
  db: {
    generationFlows: {
      create: vi.fn(),
      listByProduct: vi.fn(),
    },
  },
}));

import { db } from '@/lib/services/db';

describe('Studio API - POST /api/studio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require productId', async () => {
    const request = new NextRequest('http://localhost:3000/api/studio', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await createStudio(request);

    expect(response.status).toBe(400);
  });

  it('should create a studio session', async () => {
    vi.mocked(db.generationFlows.create).mockResolvedValue({
      id: 'flow-1',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/studio', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod-1',
        productName: 'Chair',
        clientId: 'client-1',
        baseImageId: 'img-1',
      }),
    });

    const response = await createStudio(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(db.generationFlows.create).toHaveBeenCalledWith('client-1',
      expect.objectContaining({
        productIds: ['prod-1'],
        selectedBaseImages: { 'prod-1': 'img-1' },
      })
    );
    expect(data.id).toBe('flow-1');
    expect(data.productId).toBe('prod-1');
    expect(data.type).toBe('single');
  });

  it('should handle errors', async () => {
    vi.mocked(db.generationFlows.create).mockRejectedValueOnce(new Error('DB failed'));

    const request = new NextRequest('http://localhost:3000/api/studio', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod-1' }),
    });

    const response = await createStudio(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('DB failed');
  });
});

describe('Studio API - GET /api/studio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require productId', async () => {
    const request = new NextRequest('http://localhost:3000/api/studio');
    const response = await listStudios(request);

    expect(response.status).toBe(400);
  });

  it('should return generation flows for product', async () => {
    vi.mocked(db.generationFlows.listByProduct).mockResolvedValue([
      { id: 'flow-1' },
      { id: 'flow-2' },
    ] as any);

    const request = new NextRequest('http://localhost:3000/api/studio?productId=prod-1');
    const response = await listStudios(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
  });
});
