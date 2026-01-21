/**
 * API Route: Upscale image using Gemini
 * Enhances resolution while preserving details
 */

import { NextResponse } from 'next/server';
import { getGeminiService } from 'visualizer-ai';
import { withSecurity, validateImageUrl } from '@/lib/security';

interface UpscaleImageRequest {
  imageDataUrl: string;
  targetResolution?: '2k' | '4k';
}

export const POST = withSecurity(async (request) => {
  const body: UpscaleImageRequest = await request.json();

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

  // Use edit image with upscale/enhance prompt
  const resolution = body.targetResolution ?? '2k';
  const prompt = `Upscale and enhance this image to ${resolution} resolution. Increase sharpness, enhance fine details, reduce noise, and improve overall clarity. Maintain the exact same content, composition, colors, and style - only improve the technical quality and resolution.`;

  const result = await geminiService.editImage({
    baseImageDataUrl: body.imageDataUrl,
    prompt,
    editMode: 'controlled_editing',
  });

  return NextResponse.json({
    success: true,
    imageDataUrl: result.editedImageDataUrl,
  });
});
