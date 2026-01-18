/**
 * API Route: Get job status
 * GET /api/jobs/[id]
 *
 * Uses PostgreSQL generation_job table for job status.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Get job from PostgreSQL
    const job = await db.generationJobs.getById(id);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Map status to expected format (processing -> active for backwards compat)
    const status = job.status === 'processing' ? 'active' : job.status;

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      imageIds: job.result?.imageIds ?? [],
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error('Failed to get job status:', error);
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 });
  }
}
