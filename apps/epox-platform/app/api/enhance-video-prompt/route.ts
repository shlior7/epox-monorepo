/**
 * API Route: Enhance Video Prompt
 * Analyzes the source image and enhances the video prompt to professional quality
 * Uses Gemini 2.0 Flash Exp for fast, high-quality vision analysis
 */

import { NextResponse } from 'next/server';
import type { VideoPromptSettings } from 'visualizer-types';
import { withSecurity } from '@/lib/security';
import { getGeminiService, RateLimitError } from 'visualizer-ai';

// ===== REQUEST/RESPONSE TYPES =====

interface EnhanceVideoPromptRequest {
  videoType?: VideoPromptSettings['videoType'];
  settings?: VideoPromptSettings;
  userPrompt?: string;
  sourceImageUrl: string;
}

interface EnhanceVideoPromptResponse {
  success: boolean;
  enhancedPrompt?: string;
  error?: string;
  retryAfter?: number; // Seconds to wait before retrying (for rate limiting)
}

// ===== MAIN HANDLER =====

export const POST = withSecurity(async (request): Promise<NextResponse<EnhanceVideoPromptResponse>> => {
  const body: EnhanceVideoPromptRequest = await request.json();

  const { videoType, settings, userPrompt, sourceImageUrl } = body;

  if (!sourceImageUrl) {
    return NextResponse.json({ success: false, error: 'Missing sourceImageUrl' }, { status: 400 });
  }

  try {
    const geminiService = getGeminiService();
    const enhancedPrompt = await geminiService.enhanceVideoPrompt(
      sourceImageUrl,
      videoType,
      settings,
      userPrompt
    );

    return NextResponse.json({
      success: true,
      enhancedPrompt,
    });
  } catch (error) {
    console.error('Video prompt enhancement error:', error);

    // Handle rate limiting errors with 503 Service Unavailable
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

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enhance video prompt',
      },
      { status: 500 }
    );
  }
});
