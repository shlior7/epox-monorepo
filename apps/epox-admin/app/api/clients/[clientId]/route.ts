import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { deleteClientRecord, getClient, updateClientRecord } from '@/lib/services/db/storage-service';

/**
 * GET /api/clients/[clientId] - Get a single client
 * PUT /api/clients/[clientId] - Update client
 * DELETE /api/clients/[clientId] - Delete client
 */

export const GET = requireAdmin(async (_request: Request, { params }) => {
  try {
    const { clientId } = await params;
    const client = await getClient(clientId);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error: any) {
    console.error('❌ Failed to get client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId } = await params;
    const updates = await request.json();
    const updatedClient = await updateClientRecord(clientId, updates);
    return NextResponse.json({ client: updatedClient });
  } catch (error: any) {
    console.error('❌ Failed to update client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const DELETE = requireAdmin(async (_request: Request, { params }) => {
  try {
    const { clientId } = await params;
    await deleteClientRecord(clientId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Failed to delete client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
