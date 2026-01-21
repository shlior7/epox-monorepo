/**
 * API Route: Edit image using Gemini
 * Takes a base image and edit prompt, returns the edited image as a data URL
 */

import { NextResponse } from 'next/server';
import { getGeminiService, RateLimitError } from 'visualizer-ai';
import type { EditImageRequest, EditImageResponse } from 'visualizer-ai';
import { withSecurity, validateImageUrl } from '@/lib/security';

export const POST = withSecurity(
  async (
    request
  ): Promise<NextResponse<EditImageResponse | { success: boolean; error: string }>> => {
    try {
      const body: EditImageRequest = await request.json();

      if (!body.baseImageDataUrl) {
        return NextResponse.json(
          { success: false, error: 'Missing baseImageDataUrl' },
          { status: 400 }
        );
      }
      if (!body.prompt) {
        return NextResponse.json({ success: false, error: 'Missing prompt' }, { status: 400 });
      }

      // Validate data URL format
      const urlValidation = validateImageUrl(body.baseImageDataUrl);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { success: false, error: urlValidation.error ?? 'Invalid image data URL' },
          { status: 400 }
        );
      }

      const geminiService = getGeminiService();
      const result = await geminiService.editImage(body);

      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
  }
);
