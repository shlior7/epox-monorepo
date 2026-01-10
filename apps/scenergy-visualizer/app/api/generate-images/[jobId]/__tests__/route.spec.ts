import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

const { getMock, rateLimitMock, getRateLimitHeadersMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  rateLimitMock: vi.fn(),
  getRateLimitHeadersMock: vi.fn(),
}));

vi.mock('@/lib/services/image-generation', () => ({
  imageGenerationQueue: {
    get: getMock,
  },
}));

vi.mock('@/lib/middleware/rate-limiter', () => ({
  rateLimit: rateLimitMock,
  getRateLimitHeaders: getRateLimitHeadersMock,
  RateLimitConfigs: {
    jobStatus: { windowMs: 60_000, maxRequests: 100, keyPrefix: 'status' },
  },
}));

const createRequest = () => new NextRequest('http://localhost/api/generate-images/job-123');

describe('GET /api/generate-images/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMock.mockResolvedValue(null);
    getRateLimitHeadersMock.mockReturnValue({ 'X-RateLimit-Limit': '100' });
  });

  it('returns rate limit response when exceeded', async () => {
    const limitedResponse = new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
    rateLimitMock.mockResolvedValueOnce(limitedResponse as any);

    const response = await GET(createRequest(), { params: Promise.resolve({ jobId: 'job-123' }) });
    expect(response.status).toBe(429);
    const payload = await response.json();
    expect(payload.error).toBe('Rate limit exceeded');
    expect(getMock).not.toHaveBeenCalled();
  });

  it('returns 404 when job not found', async () => {
    getMock.mockResolvedValueOnce(null);

    const response = await GET(createRequest(), { params: Promise.resolve({ jobId: 'missing' }) });
    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.error).toBe('Job not found');
  });

  it('returns job status with headers', async () => {
    const job = {
      id: 'job-123',
      status: 'completed',
      progress: 100,
      imageIds: ['image.jpg'],
      error: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:10:00.000Z',
      completedAt: '2024-01-01T00:10:00.000Z',
    };
    getMock.mockResolvedValueOnce(job);

    const response = await GET(createRequest(), { params: Promise.resolve({ jobId: 'job-123' }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
    const payload = await response.json();
    expect(payload).toMatchObject({
      jobId: 'job-123',
      status: 'completed',
      progress: 100,
      imageIds: ['image.jpg'],
      error: null,
    });
  });

  it('returns 500 on unexpected errors', async () => {
    getMock.mockRejectedValueOnce(new Error('Redis down'));

    const response = await GET(createRequest(), { params: Promise.resolve({ jobId: 'job-123' }) });
    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload.error).toBe('Redis down');
  });
});
