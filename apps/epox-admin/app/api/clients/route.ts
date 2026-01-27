import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { listClients } from '@/lib/services/db/storage-service';

/**
 * API route to list all clients from S3
 * This keeps AWS credentials server-side only
 */
export const GET = requireAdmin(async () => {
  try {
    const clients = await listClients();
    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('❌ Failed to list clients:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({ error: error.message || 'Failed to list clients' }, { status: 500 });
  }
});
