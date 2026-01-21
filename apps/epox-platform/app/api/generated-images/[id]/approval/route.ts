/**
 * Update approval status for a generated image
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import type { ApprovalStatus } from 'visualizer-types';

// TODO: Replace with actual auth when implemented
const PLACEHOLDER_CLIENT_ID = 'test-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, approved, rejected' },
        { status: 400 }
      );
    }

    // Get the asset to verify ownership
    const asset = await db.generatedAssets.getById(id);

    if (!asset || asset.clientId !== PLACEHOLDER_CLIENT_ID) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Update approval status
    await db.generatedAssets.update(id, { approvalStatus: status as ApprovalStatus });

    console.log(`✓ Asset ${id} approval status: ${status}`);
    return NextResponse.json({ success: true, approvalStatus: status });
  } catch (error: unknown) {
    console.error('❌ Failed to update approval status:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
