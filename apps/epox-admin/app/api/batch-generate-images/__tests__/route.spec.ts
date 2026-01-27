import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

const { enqueueMock, rateLimitMock, getRateLimitHeadersMock, processBatchMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
  rateLimitMock: vi.fn(),
  getRateLimitHeadersMock: vi.fn(),
  processBatchMock: vi.fn(),
}));

vi.mock('@/lib/services/image-generation', () => ({
  imageGenerationQueue: {
    enqueue: enqueueMock,
  },
}));

vi.mock('@/lib/middleware/rate-limiter', () => ({
  rateLimit: rateLimitMock,
  getRateLimitHeaders: getRateLimitHeadersMock,
  RateLimitConfigs: {},
}));

vi.mock('@/lib/utils/batch-processor', () => ({
  processBatch: processBatchMock,
}));

const createRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/batch-generate-images', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
    },
  });

describe('POST /api/batch-generate-images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processBatchMock.mockImplementation(async (items: any[], processor: any) => {
      const results = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const result = await processor(items[i], i);
          results.push({ item: items[i], result, success: true });
        } catch (error) {
          results.push({
            item: items[i],
            error: error instanceof Error ? error : new Error(String(error)),
            success: false,
          });
        }
      }
      return results;
    });
    getRateLimitHeadersMock.mockReturnValue({ 'X-Test': '1' });
    rateLimitMock.mockResolvedValue(null);
    enqueueMock.mockReset();
  });

  it('returns 400 when requests array missing', async () => {
    const request = createRequest({});

    const response = await POST(request);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe('Missing or invalid requests array');
  });

  it('validates required request fields', async () => {
    const request = createRequest({
      requests: [{ clientId: 'client', productId: 'product' }],
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toContain('Each request must have');
  });

  it('respects rate limiter responses', async () => {
    const rateLimitedResponse = new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
    rateLimitMock.mockResolvedValue(rateLimitedResponse as any);

    const request = createRequest({
      requests: [{ clientId: 'client', productId: 'product', sessionId: 'session', prompt: '', settings: {} }],
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const payload = await response.json();
    expect(payload.error).toBe('Rate limit exceeded');
    expect(processBatchMock).not.toHaveBeenCalled();
  });

  it('enqueues jobs and returns summary', async () => {
    enqueueMock
      .mockResolvedValueOnce({ jobId: 'job-1', expectedImageIds: ['image-1'] })
      .mockResolvedValueOnce({ jobId: 'job-2', expectedImageIds: ['image-2'] });

    const requests = [
      { clientId: 'client', productId: 'product-1', sessionId: 'session-1', prompt: 'A', settings: {}, productImageId: 'img-1' },
      { clientId: 'client', productId: 'product-2', sessionId: 'session-2', prompt: 'B', settings: {}, isClientSession: true },
    ];

    const request = createRequest({
      requests,
      batchConfig: { batchSize: 2, delayBetweenBatches: 0 },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(enqueueMock).toHaveBeenCalledTimes(2);
    expect(payload.summary).toEqual({ total: 2, successful: 2, failed: 0 });
    expect(payload.results).toEqual([
      {
        productId: 'product-1',
        jobId: 'job-1',
        expectedImageIds: ['image-1'],
        success: true,
      },
      {
        productId: 'product-2',
        jobId: 'job-2',
        expectedImageIds: ['image-2'],
        success: true,
      },
    ]);
    expect(response.headers.get('X-Test')).toBe('1');
  });

  it('records per-item errors without failing entire batch', async () => {
    enqueueMock.mockResolvedValueOnce({ jobId: 'job-1', expectedImageIds: ['image-1'] }).mockRejectedValueOnce(new Error('Queue failure'));

    const request = createRequest({
      requests: [
        { clientId: 'client', productId: 'product-1', sessionId: 'session-1', prompt: 'A', settings: {} },
        { clientId: 'client', productId: 'product-2', sessionId: 'session-2', prompt: 'B', settings: {} },
      ],
      batchConfig: { batchSize: 2, delayBetweenBatches: 0 },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(payload.summary).toEqual({ total: 2, successful: 1, failed: 1 });
    expect(payload.results[1]).toMatchObject({
      productId: 'product-2',
      success: false,
      error: 'Queue failure',
    });
  });

  it('returns 500 when request parsing fails', async () => {
    const request = createRequest({
      requests: [{ clientId: 'client', productId: 'product', sessionId: 'session', prompt: '', settings: {} }],
    });
    (request as any).json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

    const response = await POST(request);
    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload.error).toBe('Invalid JSON');
  });
});
