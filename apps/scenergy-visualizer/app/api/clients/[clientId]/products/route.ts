import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { createProductRecord } from '@/lib/services/db/storage-service';
import type { CreateProductPayload } from '@/lib/types/app-types';

/**
 * POST /api/clients/[clientId]/products - Add a new product
 */
export const POST = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId } = await params;
    const payload: CreateProductPayload = await request.json();

    const product = await createProductRecord(clientId, payload);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('❌ Failed to add product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
