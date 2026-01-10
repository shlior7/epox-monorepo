import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getS3Bucket } from '@/lib/services/s3/client';

/**
 * API route to download images from S3
 * This avoids CORS issues by proxying the download through the server
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Extract the S3 key from the URL
    // URL format: https://bucket-name.s3.amazonaws.com/key or https://bucket-name.s3.region.amazonaws.com/key
    let key: string;
    try {
      const urlObj = new URL(url);
      // Remove leading slash and decode
      key = decodeURIComponent(urlObj.pathname.substring(1));
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const s3 = getS3Client();
    const bucket = getS3Bucket();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3.send(command);

    // Get the image data as a buffer
    const imageBuffer = await response.Body?.transformToByteArray();

    if (!imageBuffer) {
      return NextResponse.json({ error: 'Failed to retrieve image' }, { status: 500 });
    }

    // Determine content type from S3 metadata or file extension
    const contentType = response.ContentType || 'image/jpeg';
    const extension = key.split('.').pop()?.toLowerCase();
    const filename = `image-${Date.now()}.${extension || 'jpg'}`;

    // Return the image with appropriate headers
    return new NextResponse(Buffer.from(imageBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    return NextResponse.json({ error: 'Failed to download image' }, { status: 500 });
  }
}
