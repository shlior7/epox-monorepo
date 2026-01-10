import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

const { enqueueMock, rateLimitMock, getRateLimitHeadersMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
  rateLimitMock: vi.fn(),
  getRateLimitHeadersMock: vi.fn(),
}));

vi.mock('@/lib/services/image-generation', () => ({
  imageGenerationQueue: {
    enqueue: enqueueMock,
  },
}));

vi.mock('@/lib/middleware/rate-limiter', () => ({
  rateLimit: rateLimitMock,
  getRateLimitHeaders: getRateLimitHeadersMock,
  RateLimitConfigs: {
    imageGeneration: { windowMs: 300_000, maxRequests: 10, keyPrefix: 'generate' },
  },
}));

const createRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/generate-images', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('POST /api/generate-images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMock.mockResolvedValue(null);
    getRateLimitHeadersMock.mockReturnValue({ 'X-RateLimit-Limit': '10' });
  });

  it('validates required parameters', async () => {
    const response = await POST(
      createRequest({ productId: 'p', sessionId: 's', prompt: '', settings: {} })
    );
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe('Missing required parameters');
  });

  it('respects rate limiting', async () => {
    const limitedResponse = new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
    rateLimitMock.mockResolvedValueOnce(limitedResponse as any);

    const response = await POST(
      createRequest({
        clientId: 'c',
        productId: 'p',
        sessionId: 's',
        prompt: 'Prompt',
        settings: {},
      })
    );

    expect(response.status).toBe(429);
    const payload = await response.json();
    expect(payload.error).toBe('Rate limit exceeded');
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('enqueues job and returns jobId with headers', async () => {
    enqueueMock.mockResolvedValueOnce({ jobId: 'job-123', expectedImageIds: ['image-1.jpg'] });

    const response = await POST(
      createRequest({
        clientId: 'client',
        productId: 'product',
        sessionId: 'session',
        prompt: 'Prompt',
        settings: {},
        productImageId: 'img',
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    const payload = await response.json();
    expect(payload).toEqual({ jobId: 'job-123', expectedImageIds: ['image-1.jpg'] });
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client',
        productId: 'product',
        sessionId: 'session',
        prompt: 'Prompt',
        productImageId: 'img',
      })
    );
  });

  it('returns 500 when enqueue fails', async () => {
    enqueueMock.mockRejectedValueOnce(new Error('Queue down'));

    const response = await POST(
      createRequest({
        clientId: 'client',
        productId: 'product',
        sessionId: 'session',
        prompt: 'Prompt',
        settings: {},
      })
    );

    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload.error).toBe('Queue down');
  });
});
