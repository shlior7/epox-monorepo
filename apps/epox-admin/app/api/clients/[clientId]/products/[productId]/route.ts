import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { deleteProductRecord, updateProductRecord } from '@/lib/services/db/storage-service';

/**
 * DELETE /api/clients/[clientId]/products/[productId] - Delete product
 */
export const DELETE = requireAdmin(async (_request: Request, { params }) => {
  try {
    const { productId } = await params;
    await deleteProductRecord(productId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Failed to delete product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

/**
 * PUT /api/clients/[clientId]/products/[productId] - Update product
 */
export const PUT = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId, productId } = await params;
    const updates = await request.json();
    await updateProductRecord(clientId, productId, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Failed to update product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
