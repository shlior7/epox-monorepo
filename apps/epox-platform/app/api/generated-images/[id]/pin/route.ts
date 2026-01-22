/**
 * Toggle pin status for a generated image
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';
import { verifyOwnership, forbiddenResponse } from '@/lib/security/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}


// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
export const POST = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    // Get the asset to verify ownership
    const asset = await db.generatedAssets.getById(id);

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify ownership
    if (
      !verifyOwnership({
        clientId,
        resourceClientId: asset.clientId,
        resourceType: 'generated-image',
        resourceId: id,
      })
    ) {
      return forbiddenResponse();
    }

    // Atomic toggle pin status (eliminates race condition)
    const updated = await db.generatedAssets.togglePin(id);

    console.log(`📌 Asset ${id} pinned status: ${updated.pinned}`);
    return NextResponse.json({ success: true, isPinned: updated.pinned });
  } catch (error: unknown) {
    console.error('❌ Failed to toggle pin status:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
