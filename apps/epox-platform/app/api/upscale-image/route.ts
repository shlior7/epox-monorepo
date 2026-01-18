/**
 * API Route: Upscale image using Gemini
 * Enhances resolution while preserving details
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getGeminiService } from 'visualizer-services';

interface UpscaleImageRequest {
  imageDataUrl: string;
  targetResolution?: '2k' | '4k';
}

export async function POST(request: NextRequest) {
  try {
    const body: UpscaleImageRequest = await request.json();

    if (!body.imageDataUrl) {
      return NextResponse.json({ success: false, error: 'Missing imageDataUrl' }, { status: 400 });
    }

    const geminiService = getGeminiService();

    // Use edit image with upscale/enhance prompt
    const resolution = body.targetResolution || '2k';
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
  } catch (error) {
    console.error('❌ Image upscale failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to upscale image' },
      { status: 500 }
    );
  }
}
