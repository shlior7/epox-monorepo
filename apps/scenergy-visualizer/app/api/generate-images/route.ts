/**
 * API Route: Generate images using Gemini with job queue
 * Now with rate limiting to prevent API abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageGenerationQueue } from '@/lib/services/image-generation';
import { rateLimit, RateLimitConfigs, getRateLimitHeaders } from '@/lib/middleware/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      productId,
      sessionId,
      prompt,
      settings,
      productImageId,
      productImageIds,
      inspirationImageId,
      isClientSession,
      modelOverrides,
    } = body;

    if (!clientId || !productId || !sessionId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimit(request, RateLimitConfigs.imageGeneration, body);
    if (rateLimitResponse) {
      return rateLimitResponse; // Rate limit exceeded
    }

    console.log('🚀 Enqueuing image generation job...');
    console.log('📋 Settings:', settings);
    console.log('📦 API received:', {
      productImageId,
      productImageIdsCount: productImageIds?.length || 0,
      inspirationImageId,
      isClientSession,
      modelOverrides,
    });

    // Enqueue the job (now async with Redis)
    const { jobId, expectedImageIds } = await imageGenerationQueue.enqueue({
      clientId,
      productId,
      sessionId,
      prompt,
      settings,
      productImageId,
      productImageIds,
      inspirationImageId,
      isClientSession,
      modelOverrides,
    });

    console.log('✅ Job enqueued:', jobId, { expectedImageIds });

    // Add rate limit headers to response
    const headers = getRateLimitHeaders(request);
    return NextResponse.json({ jobId, expectedImageIds }, { headers });
  } catch (error) {
    console.error('❌ Failed to enqueue image generation job:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to start generation' }, { status: 500 });
  }
}
