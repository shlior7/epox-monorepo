/**
 * API Route: Upload rendered product images from GLB
 * Note: Rendering happens client-side with Babylon.js CDN
 * This endpoint just receives the rendered images and uploads them to S3
 */

import { NextResponse } from 'next/server';
import { MediaPaths, uploadProductImage } from '@/lib/services/r2/media-service';
import { db } from 'visualizer-db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const clientId = formData.get('clientId') as string;
    const productId = formData.get('productId') as string;

    if (!clientId || !productId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log('📤 Uploading GLB-generated images for product:', productId);

    // Get all image files from FormData
    const imageIds: string[] = [];
    let imageIndex = 0;
    const existingImages = await db.productImages.list(productId);
    const imagesByBaseKey = new Map(existingImages.map((image) => [image.imageUrl, image]));
    let nextSortOrder = existingImages.length;

    while (true) {
      const imageFile = formData.get(`image_${imageIndex}`) as File | null;
      if (!imageFile) break;

      const imageId = imageFile.name.replace(/\.[^/.]+$/, '');
      console.log(`   - Uploading image ${imageIndex + 1}: ${imageFile.name}`);
      await uploadProductImage(clientId, productId, imageId, imageFile);

      const baseKey = MediaPaths.getProductImageBasePath(clientId, productId, imageId);
      if (!imagesByBaseKey.has(baseKey)) {
        const created = await db.productImages.create(productId, {
          imageUrl: baseKey,
          sortOrder: nextSortOrder,
        });
        imagesByBaseKey.set(baseKey, created);
        nextSortOrder += 1;
      }

      imageIds.push(imageId);
      imageIndex++;
    }

    if (imageIds.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    console.log(`✅ Uploaded ${imageIds.length} images successfully`);

    return NextResponse.json({
      success: true,
      imageIds,
      message: `Uploaded ${imageIds.length} product images`,
    });
  } catch (error) {
    console.error('❌ Failed to upload images:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload images',
      },
      { status: 500 }
    );
  }
}
