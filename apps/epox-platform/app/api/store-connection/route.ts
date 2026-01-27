/**
 * Store Connection API
 * DELETE - Disconnect/remove store connection
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const DELETE = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if connection exists
    const connection = await db.storeConnections.getByClientId(clientId);

    if (!connection) {
      return NextResponse.json({ error: 'No store connection found' }, { status: 404 });
    }

    // Delete the store connection
    // Note: This will cascade delete sync logs due to foreign key constraints
    await db.storeConnections.deleteByClientId(clientId);

    console.log(`✅ Disconnected store for client ${clientId}`);

    return NextResponse.json({
      success: true,
      message: 'Store connection removed successfully',
    });
  } catch (error: any) {
    console.error('❌ Failed to disconnect store:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
