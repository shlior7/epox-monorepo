/**
 * API Route: Analyze image components using Gemini
 * Identifies visual elements and suggests adjustments
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getGeminiService } from 'visualizer-services';

interface AnalyzeImageRequest {
  imageDataUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeImageRequest = await request.json();

    if (!body.imageDataUrl) {
      return NextResponse.json({ success: false, error: 'Missing imageDataUrl' }, { status: 400 });
    }

    const geminiService = getGeminiService();
    const result = await geminiService.analyzeComponents(body.imageDataUrl);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Image analysis failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
