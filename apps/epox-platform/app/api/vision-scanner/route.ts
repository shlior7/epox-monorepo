/**
 * API Route: Vision Scanner
 * Analyzes inspiration images to extract structured scene inventory
 * for prompt engineering in the Art Director pipeline
 */

import { NextResponse } from 'next/server';
import { getGeminiService, RateLimitError } from 'visualizer-ai';
import type { VisionAnalysisResult, InspirationImage } from 'visualizer-types';
import { withSecurity, validateImageUrl } from '@/lib/security';

interface VisionScannerRequest {
  imageUrl: string;
  sourceType?: 'upload' | 'library' | 'stock' | 'unsplash';
}

interface VisionScannerResponse {
  success: boolean;
  inspirationImage?: InspirationImage;
  analysis?: VisionAnalysisResult;
  error?: string;
}

/**
 * Converts Vision Scanner output to a human-readable prompt text
 */
function generatePromptText(analysis: VisionAnalysisResult['json']): string {
  const parts: string[] = [];

  // Style summary as the opening
  parts.push(analysis.styleSummary);

  // Architectural shell
  const walls = analysis.sceneInventory.find(
    (item) =>
      item.identity.toLowerCase().includes('wall') ||
      item.identity.toLowerCase().includes('vertical')
  );
  const floor = analysis.sceneInventory.find(
    (item) =>
      item.identity.toLowerCase().includes('floor') ||
      item.identity.toLowerCase().includes('ground')
  );

  if (walls) {
    parts.push(
      `The ${walls.identity.toLowerCase()} features ${walls.surfacePhysics} in ${walls.colorGrading}.`
    );
  }
  if (floor) {
    parts.push(
      `The ${floor.identity.toLowerCase()} is ${floor.surfacePhysics} with ${floor.colorGrading} tones.`
    );
  }

  // Hero accessories
  if (analysis.heroObjectAccessories) {
    parts.push(
      `Styled on the main subject: ${analysis.heroObjectAccessories.identity} made of ${analysis.heroObjectAccessories.materialPhysics}, ${analysis.heroObjectAccessories.placement}.`
    );
  }

  // Key props (limit to 3-4 most important)
  const props = analysis.sceneInventory
    .filter(
      (item) =>
        !item.identity.toLowerCase().includes('wall') &&
        !item.identity.toLowerCase().includes('floor') &&
        !item.identity.toLowerCase().includes('ceiling')
    )
    .slice(0, 4);

  if (props.length > 0) {
    const propDescriptions = props.map(
      (prop) => `${prop.identity} (${prop.surfacePhysics}, ${prop.colorGrading})`
    );
    parts.push(`Key elements include: ${propDescriptions.join(', ')}.`);
  }

  // Lighting
  parts.push(
    `Lighting: ${analysis.lightingPhysics.sourceDirection}, creating ${analysis.lightingPhysics.shadowQuality} with ${analysis.lightingPhysics.colorTemperature} tones.`
  );

  return parts.join(' ');
}

export const POST = withSecurity(async (request): Promise<NextResponse<VisionScannerResponse>> => {
  try {
    const body: VisionScannerRequest = await request.json();

    if (!body.imageUrl) {
      return NextResponse.json({ success: false, error: 'Missing imageUrl' }, { status: 400 });
    }

    // Validate URL for SSRF mitigation using centralized security
    const urlValidation = validateImageUrl(body.imageUrl);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, error: urlValidation.error ?? 'Invalid image URL' },
        { status: 400 }
      );
    }

    const geminiService = getGeminiService();
    const scannerOutput = await geminiService.analyzeInspirationImage(body.imageUrl);

    // Convert scanner output to VisionAnalysisResult format
    const analysis: VisionAnalysisResult = {
      json: {
        styleSummary: scannerOutput.styleSummary,
        detectedSceneType: scannerOutput.detectedSceneType,
        heroObjectAccessories: scannerOutput.heroObjectAccessories,
        sceneInventory: scannerOutput.sceneInventory,
        lightingPhysics: scannerOutput.lightingPhysics,
      },
      promptText: generatePromptText({
        styleSummary: scannerOutput.styleSummary,
        detectedSceneType: scannerOutput.detectedSceneType,
        heroObjectAccessories: scannerOutput.heroObjectAccessories,
        sceneInventory: scannerOutput.sceneInventory,
        lightingPhysics: scannerOutput.lightingPhysics,
      }),
    };

    // Create the InspirationImage object
    const inspirationImage: InspirationImage = {
      url: body.imageUrl,
      addedAt: new Date().toISOString(),
      sourceType: body.sourceType ?? 'upload',
      tags: [scannerOutput.detectedSceneType],
    };

    return NextResponse.json({
      success: true,
      inspirationImage,
      analysis,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
