/**
 * Get active client for authenticated user
 * Used by client-side auth context in dev/test mode
 */

import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/services/get-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authInfo = await getServerAuth(request);

    if (!authInfo) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      clientId: authInfo.clientId,
      clientName: authInfo.clientName,
    });
  } catch (error) {
    console.error('[GET /api/auth/client] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
