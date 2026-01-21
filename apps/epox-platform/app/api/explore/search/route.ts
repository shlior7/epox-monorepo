import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withPublicSecurity } from '@/lib/security';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export const GET = withPublicSecurity(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? 'interior design';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('per_page') ?? '12', 10);

    if (!UNSPLASH_ACCESS_KEY) {
      console.error('UNSPLASH_ACCESS_KEY not configured');
      return NextResponse.json({ error: 'Unsplash API not configured' }, { status: 500 });
    }

    // Call the Unsplash API
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unsplash API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch from Unsplash' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Map Unsplash response to our format
    const results = data.results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbUrl: photo.urls.small,
      description: photo.alt_description || photo.description || '',
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
      downloadUrl: photo.links.download_location,
    }));

    return NextResponse.json({
      results,
      total: data.total,
      total_pages: data.total_pages,
    });
  } catch (error: any) {
    console.error('Failed to search Unsplash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
