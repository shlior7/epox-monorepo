/**
 * Toggle pin status for a generated image
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';

// TODO: Replace with actual auth when implemented
const PLACEHOLDER_CLIENT_ID = 'test-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    // Get the asset to verify ownership and get current pin status
    const asset = await db.generatedAssets.getById(id);

    if (!asset || asset.clientId !== PLACEHOLDER_CLIENT_ID) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Toggle pin status
    const newPinnedStatus = !asset.pinned;
    await db.generatedAssets.update(id, { pinned: newPinnedStatus });

    console.log(`📌 Asset ${id} pinned status: ${newPinnedStatus}`);
    return NextResponse.json({ success: true, isPinned: newPinnedStatus });
  } catch (error: unknown) {
    console.error('❌ Failed to toggle pin status:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
