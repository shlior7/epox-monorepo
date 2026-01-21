/**
 * Store Connection Status API
 * GET - Get connection status
 * DELETE - Disconnect store
 */

import { type NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { getStoreService } from '@/lib/services/erp';

export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connection = await getStoreService().getConnection(clientId);

    return NextResponse.json({
      connected: connection?.status === 'active',
      connection: connection
        ? {
            id: connection.id,
            provider: connection.storeType,
            storeUrl: connection.storeUrl,
            storeName: connection.storeName,
            status: connection.status,
            lastSyncAt: connection.lastSyncAt,
            createdAt: connection.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Store connection status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
});

export const DELETE = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await getStoreService().disconnect(clientId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Store disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
});
