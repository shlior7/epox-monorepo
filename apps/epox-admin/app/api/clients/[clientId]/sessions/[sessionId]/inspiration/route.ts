import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { MediaPaths, uploadFile } from '@/lib/services/r2/media-service';

/**
 * POST /api/clients/[clientId]/sessions/[sessionId]/inspiration - Upload inspiration image
 * Used for uploading user reference images to product or client sessions
 */
export const POST = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId, sessionId } = await params;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageId = formData.get('imageId') as string;
    const productId = formData.get('productId') as string | null;

    if (!file || !imageId) {
      return NextResponse.json({ error: 'Missing file or imageId' }, { status: 400 });
    }

    // Determine the S3 path based on whether it's a product session or client session
    const path = productId
      ? MediaPaths.getMediaFilePath(clientId, productId, sessionId, imageId)
      : MediaPaths.getClientSessionMediaFilePath(clientId, sessionId, imageId);

    await uploadFile(path, file);

    return NextResponse.json({ success: true, imageId });
  } catch (error: any) {
    console.error('❌ Failed to upload inspiration image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
