import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { uploadProductModel } from '@/lib/services/r2/media-service';
import { updateProductRecord } from '@/lib/services/db/storage-service';

/**
 * POST /api/clients/[clientId]/products/[productId]/model - Upload a GLB model
 */
export const POST = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId, productId } = await params;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;

    if (!file || !filename) {
      return NextResponse.json({ error: 'Missing file or filename' }, { status: 400 });
    }

    await uploadProductModel(clientId, productId, filename, file);
    await updateProductRecord(clientId, productId, { modelFilename: filename });
    return NextResponse.json({ success: true, filename });
  } catch (error: any) {
    console.error('❌ Failed to upload model:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
