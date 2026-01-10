import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { createFlowRecord } from '@/lib/services/db/storage-service';
import type { CreateFlowPayload } from '@/lib/types/app-types';

/**
 * POST /api/clients/[clientId]/sessions/[sessionId]/flows - Add flow to studio session
 */
export const POST = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId, sessionId } = await params;
    const payload: CreateFlowPayload = await request.json();
    const flow = await createFlowRecord(clientId, sessionId, payload);
    return NextResponse.json({ success: true, flow });
  } catch (error: any) {
    console.error('❌ Failed to create flow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
