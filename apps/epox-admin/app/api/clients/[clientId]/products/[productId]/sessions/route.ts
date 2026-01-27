import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { createChatSessionRecord, saveChatSession } from '@/lib/services/db/storage-service';
import type { CreateSessionPayload, Session } from '@/lib/types/app-types';

/**
 * POST /api/clients/[clientId]/products/[productId]/sessions - Add session
 * PUT /api/clients/[clientId]/products/[productId]/sessions - Update session
 */
export const POST = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId, productId } = await params;
    const payload: CreateSessionPayload = await request.json();
    const created = await createChatSessionRecord(clientId, productId, payload);
    return NextResponse.json({ success: true, session: created });
  } catch (error: any) {
    console.error('❌ Failed to save session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId, productId } = await params;
    const { session: productSession } = await request.json();
    await saveChatSession(clientId, productId, productSession as Session);
    return NextResponse.json({ success: true, session: productSession });
  } catch (error: any) {
    console.error('❌ Failed to update session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
