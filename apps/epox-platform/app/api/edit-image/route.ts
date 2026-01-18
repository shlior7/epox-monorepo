/**
 * API Route: Edit image using Gemini
 * Takes a base image and edit prompt, returns the edited image as a data URL
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getGeminiService } from 'visualizer-services';
import type { EditImageRequest, EditImageResponse } from 'visualizer-services';

export async function POST(
  request: NextRequest
): Promise<NextResponse<EditImageResponse | { success: boolean; error: string }>> {
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

    const geminiService = getGeminiService();
    const result = await geminiService.editImage(body);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Image editing failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to edit image' },
      { status: 500 }
    );
  }
}
