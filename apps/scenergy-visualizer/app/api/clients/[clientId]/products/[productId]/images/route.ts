import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { MediaPaths, uploadProductImage, uploadProductImagePreview, deleteProductImage } from '@/lib/services/r2/media-service';
import { db } from 'visualizer-db';

/**
 * POST /api/clients/[clientId]/products/[productId]/images - Upload a product image
 * Query params:
 *   - type: 'base' (default) or 'preview'
 */
export const POST = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId, productId } = await params;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'base';

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageId = formData.get('imageId') as string;

    if (!file || !imageId) {
      return NextResponse.json({ error: 'Missing image or imageId' }, { status: 400 });
    }

    const baseKey = MediaPaths.getProductImageBasePath(clientId, productId, imageId);
    const previewKey = MediaPaths.getProductImagePreviewPath(clientId, productId, imageId);
    const existingImages = await db.productImages.list(productId);
    const imagesByBaseKey = new Map(existingImages.map((image) => [image.r2KeyBase, image]));
    let nextSortOrder = existingImages.length;

    if (type === 'preview') {
      // Convert File to data URL for preview upload
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;
      await uploadProductImagePreview(clientId, productId, imageId, dataUrl);

      const existing = imagesByBaseKey.get(baseKey);
      if (existing) {
        await db.productImages.update(existing.id, { r2KeyPreview: previewKey });
      } else {
        const created = await db.productImages.create(productId, {
          r2KeyBase: baseKey,
          r2KeyPreview: previewKey,
          sortOrder: nextSortOrder,
        });
        imagesByBaseKey.set(baseKey, created);
        nextSortOrder += 1;
      }
    } else {
      await uploadProductImage(clientId, productId, imageId, file);

      if (!imagesByBaseKey.has(baseKey)) {
        const created = await db.productImages.create(productId, {
          r2KeyBase: baseKey,
          sortOrder: nextSortOrder,
        });
        imagesByBaseKey.set(baseKey, created);
        nextSortOrder += 1;
      }
    }

    return NextResponse.json({ success: true, imageId });
  } catch (error: any) {
    console.error('❌ Failed to upload image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

/**
 * DELETE /api/clients/[clientId]/products/[productId]/images - Delete product images
 * Body: { imageIds: string[] }
 */
export const DELETE = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId, productId } = await params;

    const body = await request.json().catch(() => ({}));
    const imageIds: unknown = body.imageIds;

    if (!Array.isArray(imageIds)) {
      return NextResponse.json({ error: 'imageIds must be an array' }, { status: 400 });
    }

    const deletedIds: string[] = [];
    const errors: Array<{ imageId: string; error: string }> = [];
    const existingImages = await db.productImages.list(productId);
    const imagesByBaseKey = new Map(existingImages.map((image) => [image.r2KeyBase, image]));

    await Promise.all(
      imageIds.map(async (imageId) => {
        if (typeof imageId !== 'string' || !imageId.trim()) {
          errors.push({ imageId: String(imageId), error: 'Invalid imageId' });
          return;
        }

        try {
          await deleteProductImage(clientId, productId, imageId);
          const baseKey = MediaPaths.getProductImageBasePath(clientId, productId, imageId);
          const existing = imagesByBaseKey.get(baseKey);
          if (existing) {
            await db.productImages.delete(existing.id);
          }
          deletedIds.push(imageId);
        } catch (error: any) {
          errors.push({ imageId, error: error?.message || 'Failed to delete image' });
        }
      })
    );

    return NextResponse.json({ deletedIds, errors });
  } catch (error: any) {
    console.error('❌ Failed to delete images:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
