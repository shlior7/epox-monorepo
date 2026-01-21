/**
 * API Route: Get job status
 * GET /api/jobs/[id]
 *
 * Uses PostgreSQL generation_job table for job status.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getJobStatus } from 'visualizer-ai';
import { logger } from '@/lib/logger';

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
    const job = await getJobStatus(id);

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
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      imageIds: job.result?.imageIds ?? [],
      imageUrls: job.result?.imageUrls ?? [],
      videoIds: job.result?.videoIds ?? [],
      videoUrls: job.result?.videoUrls ?? [],
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    const eventId = Sentry.captureException(error);
    logger.error({ err: error, sentryEventId: eventId }, 'Failed to get job status');
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 });
  }
}
