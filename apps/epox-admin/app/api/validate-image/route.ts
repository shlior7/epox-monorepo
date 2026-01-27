import { NextRequest, NextResponse } from 'next/server';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getS3Bucket } from '@/lib/services/s3/client';

/**
 * API route to validate if an image exists in S3
 * This avoids CORS issues by proxying the HEAD request through the server
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    const s3 = getS3Client();
    const bucket = getS3Bucket();
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    try {
      await s3.send(command);
      return NextResponse.json({ exists: true });
    } catch (error: any) {
      if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
        return NextResponse.json({ exists: false });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error validating image:', error);
    return NextResponse.json({ error: 'Failed to validate image' }, { status: 500 });
  }
}
