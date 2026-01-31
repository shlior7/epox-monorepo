import { NextRequest, NextResponse } from 'next/server';
import { storage, storagePaths } from '@/lib/services/storage';
import { withUploadSecurity } from '@/lib/security/middleware';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 12 * 1024 * 1024; // 12MB
const PRESIGN_EXPIRY = 300; // 5 minutes

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const POST = withUploadSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { filename, contentType, size, type, productId, collectionId } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, contentType' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    if (size && size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(size / 1024 / 1024).toFixed(1)}MB). Maximum size is 12MB.` },
        { status: 400 }
      );
    }

    const extension = EXTENSION_MAP[contentType] ?? 'jpg';
    const assetId = `upload_${Date.now()}`;
    const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // For product images, presign both original + WebP slots
    if (type === 'product' && productId) {
      const originalKey = storagePaths.productImageBase(clientId, productId, imageId)
        .replace(/\.png$/, `.${extension}`);
      const webpKey = storagePaths.productImageBase(clientId, productId, imageId)
        .replace(/\.png$/, '.webp');

      const [originalPresigned, webpPresigned] = await Promise.all([
        storage.getUploadUrl(clientId, originalKey, {
          contentType,
          expiresIn: PRESIGN_EXPIRY,
        }),
        storage.getUploadUrl(clientId, webpKey, {
          contentType: 'image/webp',
          expiresIn: PRESIGN_EXPIRY,
        }),
      ]);

      console.log(`📋 Presigning product upload: ${originalKey} + ${webpKey}`);

      return NextResponse.json({
        uploadUrl: webpPresigned.url,
        key: webpPresigned.key,
        publicUrl: storage.getPublicUrl(webpPresigned.key),
        expiresAt: webpPresigned.expiresAt.toISOString(),
        // Original slot for the raw file (PNG/JPG)
        original: {
          uploadUrl: originalPresigned.url,
          key: originalPresigned.key,
        },
      });
    }

    // Non-product uploads: single presigned URL
    let storageKey: string;
    if (type === 'collection' && collectionId) {
      storageKey = storagePaths.collectionAsset(clientId, collectionId, assetId, extension);
    } else {
      storageKey = storagePaths.inspirationImage(clientId, 'temp', assetId, extension);
    }

    console.log(`📋 Presigning upload: ${storageKey}`);

    const presigned = await storage.getUploadUrl(clientId, storageKey, {
      contentType,
      expiresIn: PRESIGN_EXPIRY,
    });

    return NextResponse.json({
      uploadUrl: presigned.url,
      key: presigned.key,
      publicUrl: storage.getPublicUrl(presigned.key),
      expiresAt: presigned.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Failed to generate presigned URL:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
