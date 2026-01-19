/**
 * API Route: Analyze image components using Gemini
 * Identifies visual elements and suggests adjustments
 */

import { NextResponse } from 'next/server';
import { getGeminiService, RateLimitError } from 'visualizer-services';
import { withSecurity, validateImageUrl } from '@/lib/security';

interface AnalyzeImageRequest {
  imageDataUrl: string;
}

export const POST = withSecurity(async (request) => {
  const body: AnalyzeImageRequest = await request.json();

  if (!body.imageDataUrl) {
    return NextResponse.json({ success: false, error: 'Missing imageDataUrl' }, { status: 400 });
  }

  // Validate data URL format
  const urlValidation = validateImageUrl(body.imageDataUrl);
  if (!urlValidation.valid) {
    return NextResponse.json(
      { success: false, error: urlValidation.error ?? 'Invalid image data URL' },
      { status: 400 }
    );
  }

  try {
    const geminiService = getGeminiService();
    const result = await geminiService.analyzeComponents(body.imageDataUrl);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          success: false,
          error: `Service temporarily busy. Please try again in ${error.retryAfter} seconds.`,
          retryAfter: error.retryAfter,
        },
        {
          status: 503,
          headers: {
            'Retry-After': error.retryAfter.toString(),
          },
        }
      );
    }
    throw error;
  }
});
