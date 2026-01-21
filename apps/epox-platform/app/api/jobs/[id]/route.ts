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
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import { logger } from '@/lib/logger';

export const GET = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    // Verify ownership
    if (!verifyOwnership({
      clientId,
      resourceClientId: job.clientId,
      resourceType: 'job',
      resourceId: id,
    })) {
      return forbiddenResponse();
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
});
