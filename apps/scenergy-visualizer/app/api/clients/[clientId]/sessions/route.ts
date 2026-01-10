import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { createStudioSessionRecord, saveStudioSession } from '@/lib/services/db/storage-service';
import type { ClientSession, CreateStudioSessionPayload } from '@/lib/types/app-types';

/**
 * POST /api/clients/[clientId]/sessions - Add client session
 * PUT /api/clients/[clientId]/sessions - Update client session
 */
export const POST = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId } = await params;
    const payload: CreateStudioSessionPayload = await request.json();
    const created = await createStudioSessionRecord(clientId, payload);
    return NextResponse.json({ success: true, session: created });
  } catch (error: any) {
    console.error('❌ Failed to save client session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId } = await params;
    const { session: clientSession } = await request.json();
    await saveStudioSession(clientId, clientSession as ClientSession);
    return NextResponse.json({ success: true, session: clientSession });
  } catch (error: any) {
    console.error('❌ Failed to update client session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
