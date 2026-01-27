import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/services/storage';

/**
 * API route to download images from R2/S3
 * This avoids CORS issues by proxying the download through the server
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let imageBuffer: Uint8Array | null = null;
    let contentType: string | null = null;

    // Try direct fetch (works for public URLs and data URLs)
    try {
      const response = await fetch(url);
      if (response.ok) {
        imageBuffer = new Uint8Array(await response.arrayBuffer());
        contentType = response.headers.get('content-type');
      }
    } catch (error) {
      console.warn('Direct fetch failed, trying S3:', error);
    }

    // If direct fetch failed, try extracting key from URL and use storage
    if (!imageBuffer && (url.includes('r2') || url.includes('s3'))) {
      try {
        const urlObj = new URL(url);
        const key = decodeURIComponent(urlObj.pathname.substring(1));

        const buffer = await storage.download(key);
        if (buffer) {
          imageBuffer = new Uint8Array(buffer);
          // Infer content type from key extension
          const ext = key.split('.').pop()?.toLowerCase();
          contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        }
      } catch (error) {
        console.warn('Storage fetch failed:', error);
      }
    }

    if (!imageBuffer) {
      return NextResponse.json({ error: 'Failed to download image' }, { status: 500 });
    }

    // Return the image with appropriate headers
    return new NextResponse(Buffer.from(imageBuffer), {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    return NextResponse.json({ error: 'Failed to download image' }, { status: 500 });
  }
}
