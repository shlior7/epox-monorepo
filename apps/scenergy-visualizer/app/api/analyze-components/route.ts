/**
 * API Route: Analyze image components using Gemini
 * Extracts simple component names from a generated image (bed, rug, floor, wall, plant, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl parameter' }, { status: 400 });
    }

    const geminiService = getGeminiService();
    const analysis = await geminiService.analyzeComponents(imageUrl);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('❌ Component analysis failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to analyze components' },
      { status: 500 }
    );
  }
}

