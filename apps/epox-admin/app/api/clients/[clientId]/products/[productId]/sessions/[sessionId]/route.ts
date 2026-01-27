import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-route';
import { deleteChatSession } from '@/lib/services/db/storage-service';

/**
 * DELETE /api/clients/[clientId]/products/[productId]/sessions/[sessionId] - Delete session
 */
export const DELETE = requireAdmin(async (_request: Request, { params }) => {
  try {
    const { sessionId } = await params;
    await deleteChatSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Failed to delete session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
