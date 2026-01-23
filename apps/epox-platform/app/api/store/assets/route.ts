/**
 * Store Assets API
 * GET - Fetch assets with sync status grouped by product
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';
import { getStoreService } from '@/lib/services/erp';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get store connection
    const storeService = getStoreService();
    const connection = await storeService.getConnection(clientId);

    if (!connection || connection.status !== 'active') {
      return NextResponse.json({ error: 'No active store connection found' }, { status: 404 });
    }

    // Fetch assets with sync status
    const productGroups = await db.generatedAssets.listWithSyncStatus(clientId, connection.id);

    return NextResponse.json({
      products: productGroups,
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch store assets:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
