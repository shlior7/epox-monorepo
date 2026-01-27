/**
 * API Route: Batch Generate Images
 * Handles multiple image generation requests in controlled batches
 * Prevents rate limit issues when generating images for many products
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageGenerationQueue } from '@/lib/services/image-generation';
import { rateLimit, RateLimitConfigs, getRateLimitHeaders } from '@/lib/middleware/rate-limiter';
import { processBatch } from '@/lib/utils/batch-processor';

interface BatchImageRequest {
  flowId?: string;
  clientId: string;
  productId: string;
  sessionId: string;
  prompt: string;
  settings: any;
  productImageId?: string;
  productImageIds?: Array<{ productId: string; imageId: string }>;
  inspirationImageId?: string; // S3 image ID (file in session media folder)
  inspirationImageUrl?: string; // Full URL (e.g., scene library, Unsplash)
  isClientSession?: boolean;
  modelOverrides?: {
    imageModel?: string;
    fallbackImageModel?: string;
  };
}

interface BatchImageResponse {
  flowId?: string;
  productId: string;
  jobId?: string;
  expectedImageIds?: string[];
  error?: string;
  success: boolean;
}

interface BatchRequestBody {
  requests: BatchImageRequest[];
  // Batch configuration (optional, with sensible defaults)
  batchConfig?: {
    batchSize?: number; // Items per batch (default: 3)
    delayBetweenBatches?: number; // Delay in ms (default: 2000)
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchRequestBody = await request.json();
    const { requests, batchConfig } = body;

    // Validate requests array
    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid requests array' }, { status: 400 });
    }

    // Validate each request has required fields
    for (const req of requests) {
      if (!req.clientId || !req.productId || !req.sessionId) {
        return NextResponse.json(
          {
            error: 'Each request must have clientId, productId, and sessionId',
            invalidRequest: req,
          },
          { status: 400 }
        );
      }
    }

    // Apply rate limiting using centralized config
    // Limits are configurable via RATE_LIMIT_TIER or RATE_LIMIT_BATCH env vars
    const rateLimitResponse = await rateLimit(request, RateLimitConfigs.batch, {
      clientId: requests[0].clientId, // Use first request's clientId for rate limiting
    });

    if (rateLimitResponse) {
      return rateLimitResponse; // Rate limit exceeded
    }

    console.log(`🚀 Starting batch image generation for ${requests.length} products...`);

    // Default batch configuration
    const config = {
      batchSize: batchConfig?.batchSize || 3, // Process 3 at a time by default
      delayBetweenBatches: batchConfig?.delayBetweenBatches || 2000, // 2 second delay between batches
    };

    // Process requests in batches
    const results = await processBatch<BatchImageRequest, BatchImageResponse>(
      requests,
      async (req, index) => {
        console.log(`📋 Enqueuing job ${index + 1}/${requests.length} for product ${req.productId}...`);
        console.log(`   - Inspiration Image ID: ${req.inspirationImageId || 'none'}`);
        console.log(`   - Inspiration Image URL: ${req.inspirationImageUrl || 'none'}`);
        console.log(`   - Product Image ID: ${req.productImageId || 'none'}`);
        console.log(`   - Product Image IDs: ${req.productImageIds?.length || 0}`);
        console.log(`   - Is Client Session: ${req.isClientSession}`);

        try {
          // Enqueue the job
          const { jobId, expectedImageIds } = await imageGenerationQueue.enqueue({
            clientId: req.clientId,
            productId: req.productId,
            sessionId: req.sessionId,
            prompt: req.prompt,
            settings: req.settings,
            productImageId: req.productImageId,
            productImageIds: req.productImageIds,
            inspirationImageId: req.inspirationImageId,
            inspirationImageUrl: req.inspirationImageUrl,
            isClientSession: req.isClientSession,
            modelOverrides: req.modelOverrides,
          });

          console.log(`✅ Job ${jobId} enqueued for product ${req.productId}`);
          console.log(`   - Inspiration Image ID passed: ${req.inspirationImageId || 'none'}`);
          console.log(`   - Inspiration Image URL passed: ${req.inspirationImageUrl || 'none'}`);

          return {
            flowId: req.flowId,
            productId: req.productId,
            jobId,
            expectedImageIds,
            success: true,
          };
        } catch (error) {
          console.error(`❌ Failed to enqueue job for product ${req.productId}:`, error);
          return {
            flowId: req.flowId,
            productId: req.productId,
            error: error instanceof Error ? error.message : 'Failed to enqueue job',
            success: false,
          };
        }
      },
      config
    );

    // Compile results
    const batchResults: BatchImageResponse[] = results.map((r) => {
      if (r.success && r.result) {
        return r.result;
      }
      return {
        flowId: r.item.flowId,
        productId: r.item.productId,
        error: r.error?.message || 'Unknown error',
        success: false,
      };
    });

    const successCount = batchResults.filter((r) => r.success).length;
    console.log(`✅ Batch complete: ${successCount}/${requests.length} jobs enqueued successfully`);

    // Add rate limit headers to response
    const headers = getRateLimitHeaders(request);

    return NextResponse.json(
      {
        success: true,
        results: batchResults,
        summary: {
          total: requests.length,
          successful: successCount,
          failed: requests.length - successCount,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error('❌ Batch image generation failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process batch',
      },
      { status: 500 }
    );
  }
}
