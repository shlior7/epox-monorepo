import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { checkRateLimit, rateLimit, getRateLimitHeaders } from '../rate-limiter';

const { redisIncrMock, redisExpireMock, redisTtlMock } = vi.hoisted(() => ({
  redisIncrMock: vi.fn<[], Promise<number>>(),
  redisExpireMock: vi.fn<[], Promise<number>>(),
  redisTtlMock: vi.fn<[], Promise<number>>(),
}));

vi.mock('../../services/redis/client', () => ({
  redis: {
    incr: redisIncrMock,
    expire: redisExpireMock,
    ttl: redisTtlMock,
  },
}));

const config = {
  windowMs: 60_000,
  maxRequests: 2,
  keyPrefix: 'test',
};

const createRequest = (url = 'http://localhost/api', body?: any, method: string = 'POST') =>
  new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  });

describe('rate-limiter', () => {
  const now = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    redisIncrMock.mockReset();
    redisExpireMock.mockReset();
    redisTtlMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests below threshold', async () => {
    redisIncrMock.mockResolvedValueOnce(1);
    redisExpireMock.mockResolvedValueOnce(1);
    redisTtlMock.mockResolvedValueOnce(45);

    const result = await checkRateLimit('client-123', config);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.resetTime).toBe(now.getTime() + 45 * 1000);
    expect(redisExpireMock).toHaveBeenCalledWith(`${config.keyPrefix}:client-123`, 60);
  });

  it('blocks requests exceeding limit and reports reset time', async () => {
    redisIncrMock.mockResolvedValueOnce(config.maxRequests + 1);
    redisTtlMock.mockResolvedValueOnce(30);

    const result = await checkRateLimit('client-123', config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetTime).toBe(now.getTime() + 30 * 1000);
  });

  it('fails open when Redis errors', async () => {
    redisIncrMock.mockRejectedValueOnce(new Error('Redis unavailable'));

    const result = await checkRateLimit('client-123', config);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(config.maxRequests);
    expect(result.resetTime).toBe(now.getTime() + config.windowMs);
  });

  it('rateLimit returns 429 response when limit exceeded', async () => {
    redisIncrMock.mockResolvedValueOnce(config.maxRequests + 1);
    redisTtlMock.mockResolvedValueOnce(15);

    const request = createRequest(undefined, { clientId: 'client-123' });
    const response = await rateLimit(request, config, { clientId: 'client-123' });

    expect(response?.status).toBe(429);
    const payload = await response?.json();
    expect(payload.error).toBe('Rate limit exceeded');
    expect(response?.headers.get('Retry-After')).toBe('15');
  });

  it('rateLimit allows request and sets headers', async () => {
    redisIncrMock.mockResolvedValueOnce(1);
    redisExpireMock.mockResolvedValueOnce(1);
    redisTtlMock.mockResolvedValueOnce(50);

    const request = createRequest(undefined, { clientId: 'client-123' });
    const result = await rateLimit(request, config, { clientId: 'client-123' });

    expect(result).toBeNull();
    const headers = getRateLimitHeaders(request);
    expect(headers).toEqual({
      'X-RateLimit-Limit': '2',
      'X-RateLimit-Remaining': '1',
      'X-RateLimit-Reset': (now.getTime() + 50 * 1000).toString(),
    });
  });

  it('getRateLimitHeaders returns empty object when unset', () => {
    const request = createRequest();
    expect(getRateLimitHeaders(request)).toEqual({});
  });
});
