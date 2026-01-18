/**
 * API Route: Vision Scanner
 * Analyzes inspiration images to extract structured scene inventory
 * for prompt engineering in the Art Director pipeline
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getGeminiService } from 'visualizer-services';
import type { VisionAnalysisResult, InspirationImage } from 'visualizer-types';

// Allowed URL protocols for image URLs
const ALLOWED_PROTOCOLS = ['https:'];

// Allowed domains for image URLs
const ALLOWED_DOMAINS = [
  // Cloudflare R2 storage
  'pub-5cb0d6bfdf524f9cb1c47e52bbe80f74.r2.dev',
  // Add other trusted domains here
];

// Pattern for Cloudflare R2 public bucket URLs (pub-{hash}.r2.dev)
const CLOUDFLARE_R2_PATTERN = /^pub-[a-f0-9]+\.r2\.dev$/;

// Strict data URL pattern for images
const DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Validates an image URL - checks protocol and domain for SSRF mitigation
 */
function isValidImageUrl(urlString: string): boolean {
  // Allow data URLs
  if (urlString.startsWith('data:image/')) {
    return DATA_URL_PATTERN.test(urlString);
  }

  try {
    const url = new URL(urlString);

    // Check protocol (only HTTPS in production)
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return false;
    }

    // Check against allowlist
    const isAllowedDomain =
      ALLOWED_DOMAINS.includes(url.hostname) || CLOUDFLARE_R2_PATTERN.test(url.hostname);

    return isAllowedDomain;
  } catch {
    return false;
  }
}

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

export async function POST(request: NextRequest): Promise<NextResponse<VisionScannerResponse>> {
  try {
    const body: VisionScannerRequest = await request.json();

    if (!body.imageUrl) {
      return NextResponse.json({ success: false, error: 'Missing imageUrl' }, { status: 400 });
    }

    // Validate URL for SSRF mitigation
    if (!isValidImageUrl(body.imageUrl)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid image URL. Only HTTPS URLs from trusted domains are allowed.',
        },
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
    console.error('❌ Vision Scanner failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze inspiration image',
      },
      { status: 500 }
    );
  }
}
