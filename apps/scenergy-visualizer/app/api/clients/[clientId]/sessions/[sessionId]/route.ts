import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { deleteStudioSession } from '@/lib/services/db/storage-service';

/**
 * DELETE /api/clients/[clientId]/sessions/[sessionId] - Delete client session
 */
export const DELETE = requireAdmin(async (_request: Request, { params }) => {
  try {
    const { sessionId } = await params;
    await deleteStudioSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Failed to delete client session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
