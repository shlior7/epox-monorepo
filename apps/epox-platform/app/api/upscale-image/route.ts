/**
 * API Route: Upscale image using Gemini
 * Enhances resolution while preserving details
 */

import { NextResponse } from 'next/server';
import { getGeminiService } from 'visualizer-ai';
import { withSecurity, validateImageUrl } from '@/lib/security';
import { enforceQuota, consumeCredits } from '@/lib/services/quota';

interface UpscaleImageRequest {
  imageDataUrl: string;
  targetResolution?: '2k' | '4k';
}


// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

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

  // Enforce quota before processing
  const quotaDenied = await enforceQuota(clientId, 1);
  if (quotaDenied) return quotaDenied;

  const geminiService = getGeminiService();

  // Use edit image with upscale/enhance prompt
  const resolution = body.targetResolution ?? '2k';
  const prompt = `Upscale and enhance this image to ${resolution} resolution. Increase sharpness, enhance fine details, reduce noise, and improve overall clarity. Maintain the exact same content, composition, colors, and style - only improve the technical quality and resolution.`;

  const result = await geminiService.editImage({
    baseImageDataUrl: body.imageDataUrl,
    prompt,
    editMode: 'controlled_editing',
  });

  // Consume credits after successful processing
  await consumeCredits(clientId, 1);

  return NextResponse.json({
    success: true,
    imageDataUrl: result.editedImageDataUrl,
  });
});
