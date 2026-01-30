/**
 * API Route: Batch get job statuses
 * POST /api/jobs/batch
 *
 * Body: { jobIds: string[] }
 * Returns statuses for all requested jobs in a single request.
 */

import { NextResponse } from 'next/server';
import { getJobStatusBatch } from 'visualizer-ai';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobIds } = body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: 'jobIds must be a non-empty array' }, { status: 400 });
    }

    // Cap at 100 jobs per batch
    const ids = jobIds.slice(0, 100);
    const jobs = await getJobStatusBatch(ids);

    // Verify ownership for all returned jobs
    const ownedJobs = jobs.filter((job) =>
      verifyOwnership({
        clientId,
        resourceClientId: job.clientId,
        resourceType: 'job',
        resourceId: job.id,
      })
    );

    // Map to response format
    const jobStatuses = Object.fromEntries(
      ownedJobs.map((job) => [
        job.id,
        {
          id: job.id,
          type: job.type,
          status: job.status === 'processing' ? 'active' : job.status,
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
        },
      ])
    );

    return NextResponse.json({ jobs: jobStatuses });
  } catch (error) {
    console.error('Failed to batch get job statuses:', error);
    return NextResponse.json({ error: 'Failed to get job statuses' }, { status: 500 });
  }
});
