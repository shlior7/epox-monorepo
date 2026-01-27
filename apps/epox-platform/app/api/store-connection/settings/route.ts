/**
 * Store Connection Settings API
 * GET - Fetch current sync settings
 * PUT - Update sync settings
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

// Settings response format
// Note: imageQuality and imageFormat are stored in the frontend localStorage for now
// Only autoSyncOnApproval is persisted in the database (syncOnApproval field)
interface SyncSettings {
  autoSyncOnApproval: boolean;
  imageQuality: 'high' | 'medium' | 'compressed';
  imageFormat: 'original' | 'webp' | 'png' | 'jpeg';
}

export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the store connection
    const connection = await db.storeConnections.getByClientId(clientId);

    if (!connection) {
      return NextResponse.json({ error: 'No store connection found' }, { status: 404 });
    }

    // Return settings from the database fields
    const settings: SyncSettings = {
      autoSyncOnApproval: connection.syncOnApproval,
      // These are defaults - actual values come from localStorage on the frontend
      imageQuality: 'high',
      imageFormat: 'original',
    };

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('❌ Failed to fetch store settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});

export const PUT = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { autoSyncOnApproval } = body;

    // Validate settings
    if (typeof autoSyncOnApproval !== 'boolean') {
      return NextResponse.json(
        { error: 'autoSyncOnApproval must be a boolean' },
        { status: 400 }
      );
    }

    // Get the store connection
    const connection = await db.storeConnections.getByClientId(clientId);

    if (!connection) {
      return NextResponse.json({ error: 'No store connection found' }, { status: 404 });
    }

    // Update settings in database
    await db.storeConnections.update(connection.id, {
      syncOnApproval: autoSyncOnApproval,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('❌ Failed to update store settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
