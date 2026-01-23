/**
 * Favorite Asset API
 * POST - Toggle favorite status for an asset
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assetId } = body;

    // Validate request
    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
    }

    // Verify asset exists and belongs to client
    const asset = await db.generatedAssets.getById(assetId);
    if (!asset || asset.clientId !== clientId) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Toggle favorite
    const isFavorite = await db.favoriteImages.toggle(clientId, assetId);

    return NextResponse.json({
      success: true,
      isFavorite,
    });
  } catch (error: any) {
    console.error('❌ Failed to toggle favorite:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
