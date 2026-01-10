/**
 * API Route: Analyze scene image using Gemini
 * Extracts settings and generates a prompt from a backdrop/scene image
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiService } from '@/lib/services/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sceneImageUrl } = body;

    if (!sceneImageUrl) {
      return NextResponse.json({ error: 'Missing sceneImageUrl parameter' }, { status: 400 });
    }

    const geminiService = getGeminiService();
    const analysis = await geminiService.analyzeScene(sceneImageUrl);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('❌ Scene analysis failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to analyze scene' },
      { status: 500 }
    );
  }
}

