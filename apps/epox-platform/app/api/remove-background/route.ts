/**
 * API Route: Remove background from image using Gemini
 */

import { NextResponse } from 'next/server';
import { getGeminiService } from 'visualizer-ai';
import { withSecurity, validateImageUrl } from '@/lib/security';

interface RemoveBackgroundRequest {
  imageDataUrl: string;
  keepShadow?: boolean;
}

export const POST = withSecurity(async (request) => {
  const body: RemoveBackgroundRequest = await request.json();

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

  const geminiService = getGeminiService();

  // Use edit image with background removal prompt
  const prompt = body.keepShadow
    ? 'Remove the background from this image completely. Replace it with a pure white background. Keep natural shadows under the subject for realism. Maintain the subject perfectly - do not change, distort, or modify the main subject in any way.'
    : 'Remove the background from this image completely. Replace it with a pure white background. Remove all shadows. Maintain the subject perfectly - do not change, distort, or modify the main subject in any way.';

  const result = await geminiService.editImage({
    baseImageDataUrl: body.imageDataUrl,
    prompt,
    editMode: 'background_swap',
  });

  return NextResponse.json({
    success: true,
    imageDataUrl: result.editedImageDataUrl,
  });
});
