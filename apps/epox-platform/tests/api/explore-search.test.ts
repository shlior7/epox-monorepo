/**
 * Explore Search API Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const originalKey = process.env.UNSPLASH_ACCESS_KEY;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.UNSPLASH_ACCESS_KEY = originalKey;
});

async function loadSearchHandler() {
  const module = await import('@/app/api/explore/search/route');
  return module.GET;
}

describe('Explore Search API - GET /api/explore/search', () => {
  it('should return error when Unsplash key is missing', async () => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    vi.resetModules();
    const search = await loadSearchHandler();

    const request = new NextRequest('http://localhost:3000/api/explore/search?q=room');
    const response = await search(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('Unsplash API not configured');
  });

  it('should handle non-ok responses from Unsplash', async () => {
    process.env.UNSPLASH_ACCESS_KEY = 'test-key';
    vi.resetModules();
    const search = await loadSearchHandler();

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    );

    const request = new NextRequest('http://localhost:3000/api/explore/search?q=room');
    const response = await search(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('Failed to fetch from Unsplash');
  });

  it('should map Unsplash results', async () => {
    process.env.UNSPLASH_ACCESS_KEY = 'test-key';
    vi.resetModules();
    const search = await loadSearchHandler();

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          total: 1,
          total_pages: 1,
          results: [
            {
              id: 'photo-1',
              urls: { regular: 'https://img.regular', small: 'https://img.small' },
              alt_description: 'Modern interior',
              description: null,
              user: { name: 'Photographer', links: { html: 'https://unsplash.com/user' } },
              links: { download_location: 'https://api.unsplash.com/download/1' },
            },
          ],
        }),
        { status: 200 }
      )
    );

    const request = new NextRequest('http://localhost:3000/api/explore/search?q=room');
    const response = await search(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toMatchObject({
      id: 'photo-1',
      url: 'https://img.regular',
      thumbUrl: 'https://img.small',
      description: 'Modern interior',
      photographer: 'Photographer',
      photographerUrl: 'https://unsplash.com/user',
      downloadUrl: 'https://api.unsplash.com/download/1',
    });
  });
});
