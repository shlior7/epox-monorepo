/**
 * API Route: Process image adjustments using Sharp
 * Takes a base image data URL and adjustments, returns the processed image
 */

import { NextResponse } from 'next/server';
import { applyAdjustments, hasAdjustments } from '@/lib/services/image-processing/processor';
import type { PostAdjustments } from '@/lib/types';

interface ProcessAdjustmentsRequest {
  imageDataUrl: string;
  adjustments: PostAdjustments;
}

interface ProcessAdjustmentsResponse {
  success: boolean;
  processedImageDataUrl?: string;
  error?: string;
  processingTimeMs?: number;
}

export async function POST(request: Request): Promise<NextResponse<ProcessAdjustmentsResponse>> {
  const startTime = Date.now();

  try {
    const body: ProcessAdjustmentsRequest = await request.json();

    // Validate request
    if (!body.imageDataUrl) {
      return NextResponse.json({ success: false, error: 'Missing imageDataUrl' }, { status: 400 });
    }

    if (!body.adjustments) {
      return NextResponse.json({ success: false, error: 'Missing adjustments' }, { status: 400 });
    }

    // Check if there are any non-default adjustments
    if (!hasAdjustments(body.adjustments)) {
      // No adjustments needed, return original image
      return NextResponse.json({
        success: true,
        processedImageDataUrl: body.imageDataUrl,
        processingTimeMs: Date.now() - startTime,
      });
    }

    // Validate data URL format
    if (!body.imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid image data URL format' },
        { status: 400 }
      );
    }

    console.log('📷 Processing image adjustments...');
    console.log('   Light:', JSON.stringify(body.adjustments.light));
    console.log('   Color:', JSON.stringify(body.adjustments.color));
    console.log('   Effects:', JSON.stringify(body.adjustments.effects));

    // Apply adjustments using Sharp
    const processedImageDataUrl = await applyAdjustments(body.imageDataUrl, body.adjustments);

    const processingTimeMs = Date.now() - startTime;
    console.log(`✅ Processing completed in ${processingTimeMs}ms`);

    return NextResponse.json({
      success: true,
      processedImageDataUrl,
      processingTimeMs,
    });
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process image',
      },
      { status: 500 }
    );
  }
}
