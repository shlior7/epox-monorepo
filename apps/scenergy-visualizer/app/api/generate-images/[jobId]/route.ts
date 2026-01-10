/**
 * API Route: Check image generation job status (polling endpoint)
 * Now with rate limiting to prevent polling abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageGenerationQueue } from '@/lib/services/image-generation';
import { rateLimit, RateLimitConfigs, getRateLimitHeaders } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;

    // Apply rate limiting for polling endpoint
    const rateLimitResponse = await rateLimit(request, RateLimitConfigs.jobStatus);
    if (rateLimitResponse) {
      return rateLimitResponse; // Rate limit exceeded
    }

    // Get job from Redis (now async)
    const job = await imageGenerationQueue.get(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    console.log(`📊 API returning status for job ${jobId}:`, {
      status: job.status,
      progress: job.progress,
      imageIdsCount: job.imageIds?.length || 0,
      updatedAt: job.updatedAt,
    });

    // Return job status with rate limit headers
    const headers = getRateLimitHeaders(request);
    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        imageIds: job.imageIds,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      },
      { headers }
    );
  } catch (error) {
    console.error('❌ Failed to get job status:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to get status' }, { status: 500 });
  }
}
