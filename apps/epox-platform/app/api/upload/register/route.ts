import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/services/storage';
import { withUploadSecurity } from '@/lib/security/middleware';
import { registerProductImage } from '@/lib/services/register-upload';

export const dynamic = 'force-dynamic';

export const POST = withUploadSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, originalKey, filename, size, contentType, type, productId } = body;

    if (!key || !filename) {
      return NextResponse.json(
        { error: 'Missing required fields: key, filename' },
        { status: 400 }
      );
    }

    // Validate the key belongs to this client
    if (!key.includes(`clients/${clientId}/`)) {
      return NextResponse.json(
        { error: 'Storage key does not belong to this client' },
        { status: 403 }
      );
    }

    let productImageId: string | undefined;

    if (type === 'product' && productId) {
      const result = await registerProductImage(clientId, productId, key, originalKey);
      productImageId = result.productImageId;
    }

    const url = storage.getPublicUrl(key);

    console.log(`✅ Registered upload: ${url}`);

    return NextResponse.json({
      url,
      key,
      filename,
      size: size ?? 0,
      type: contentType ?? 'application/octet-stream',
      productImageId,
    });
  } catch (error: any) {
    console.error('❌ Failed to register upload:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
