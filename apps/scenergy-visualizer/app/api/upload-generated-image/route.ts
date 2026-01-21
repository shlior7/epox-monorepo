/**
 * API Route: Upload a generated/edited image to S3
 * Used by the image editor to save edited images to the client session media folder
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string | null;
    const sessionId = formData.get('sessionId') as string | null;
    const imageId = formData.get('imageId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!clientId || !sessionId || !imageId) {
      return NextResponse.json({ error: 'Missing required fields: clientId, sessionId, imageId' }, { status: 400 });
    }

    console.log(`📤 Uploading generated image ${imageId} for session ${sessionId}`);

    const { uploadClientSessionImage } = await import('@/lib/services/r2/media-service');

    // Check if imageId already has an extension, otherwise add one based on mime type
    let filename = imageId;
    const hasExtension = /\.(jpg|jpeg|png|webp|gif)$/i.test(imageId);
    if (!hasExtension) {
      const mimeType = file.type;
      let extension = 'png';
      if (mimeType === 'image/jpeg') extension = 'jpg';
      else if (mimeType === 'image/webp') extension = 'webp';
      filename = `${imageId}.${extension}`;
    }

    // Upload the file to S3
    const url = await uploadClientSessionImage(clientId, sessionId, filename, file);

    console.log(`✅ Uploaded generated image: ${url}`);

    return NextResponse.json({
      success: true,
      url,
      imageId,
      filename,
    });
  } catch (error) {
    console.error('❌ Failed to upload generated image:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to upload image' }, { status: 500 });
  }
}
