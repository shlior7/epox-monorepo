/**
 * Store Connection Status API
 * GET - Get connection status
 * DELETE - Disconnect store
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/services/get-auth';
import { getStoreService } from '@/lib/services/erp';

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientId(request);
    if (!clientId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

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
}

export async function DELETE(request: NextRequest) {
  try {
    const clientId = await getClientId(request);
    if (!clientId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await getStoreService().disconnect(clientId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Store disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
