/**
 * API Route: Art Director
 * Constructs the 3-segment prompt for image generation
 * by merging product subject analysis with inspiration scene analysis
 */

import { NextResponse } from 'next/server';
import type {
  SubjectAnalysis,
  VisionAnalysisResult,
  BubbleValue,
} from 'visualizer-types';
import { withSecurity } from '@/lib/security';
import { extractPromptContextFromBubbles, groupBubbleContextByCategory } from '@/lib/services/bubble-prompt-extractor';

// ===== REQUEST/RESPONSE TYPES =====

interface ArtDirectorRequest {
  subjectAnalysis?: SubjectAnalysis;
  bubbles?: BubbleValue[];
  sceneType?: string;
  userPrompt?: string;
}

interface ArtDirectorResponse {
  success: boolean;
  finalPrompt?: string;
  matchedSceneType?: string;
  segments?: {
    introAnchor: string;
    sceneNarrative: string;
    userAdditions: string;
    outroAnchor: string;
  };
  error?: string;
}

// ===== LOGIC HELPERS =====

/**
 * Logic 1: Environment Context
 * Derives environment type and design discipline from scene category
 */
function deriveEnvironmentContext(category: SubjectAnalysis['nativeSceneCategory']): {
  environmentType: string;
  designDiscipline: string;
} {
  switch (category) {
    case 'Indoor Room':
      return { environmentType: 'interior', designDiscipline: 'interior design' };
    case 'Outdoor Nature':
      return { environmentType: 'exterior', designDiscipline: 'landscape design' };
    case 'Urban/Street':
      return { environmentType: 'exterior', designDiscipline: 'urban photography' };
    case 'Studio':
      return { environmentType: 'studio', designDiscipline: 'product photography' };
    default:
      return { environmentType: 'interior', designDiscipline: 'interior design' };
  }
}

/**
 * Logic 2: Perspective Coupling
 * Derives geometric description from camera angle
 */
function deriveGeometricDescription(cameraAngle: SubjectAnalysis['inputCameraAngle']): string {
  switch (cameraAngle) {
    case 'Frontal':
      return 'A straight-on view. The rear background runs parallel to the camera frame, creating horizontal lines across the ground.';
    case 'Angled':
      return 'A three-quarter perspective view.';
    case 'Top-Down':
      return "A direct top-down bird's-eye view. The surface acts as a flat canvas filling the frame, with no walls visible, focusing entirely on the texture of the ground.";
    case 'Low Angle':
      return 'A low-angle composition looking slightly upwards. The horizon is low, emphasizing the height of the vertical elements and sky.';
    default:
      return 'A balanced perspective view.';
  }
}


/**
 * Extract style and lighting from bubbles for scene narrative
 */
function extractStyleAndLighting(bubbles: BubbleValue[]): {
  style?: string;
  lighting?: string;
} {
  const result: { style?: string; lighting?: string } = {};

  for (const bubble of bubbles) {
    if (bubble.type === 'style') {
      result.style = bubble.preset || bubble.customValue;
    } else if (bubble.type === 'lighting') {
      result.lighting = bubble.preset || bubble.customValue;
    }
  }

  return result;
}


// ===== MAIN HANDLER =====


// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
export const POST = withSecurity(async (request): Promise<NextResponse<ArtDirectorResponse>> => {
  const body: ArtDirectorRequest = await request.json();

  const { subjectAnalysis, bubbles, sceneType, userPrompt } = body;

  if (!subjectAnalysis) {
    return NextResponse.json({ success: false, error: 'Missing subjectAnalysis' }, { status: 400 });
  }

  // Extract bubble context
  let bubbleContext: string[] = [];
  if (bubbles && bubbles.length > 0) {
    bubbleContext = extractPromptContextFromBubbles(bubbles);
  }

  // Build prompt with bubble context
  const subjectClass = subjectAnalysis.subjectClassHyphenated;
  const { environmentType } = deriveEnvironmentContext(subjectAnalysis.nativeSceneCategory);

  const introAnchor = `Create an ${environmentType} ${subjectClass} scene with this ${subjectClass} from the attached image and keep the visual integrity of the ${subjectClass} from the attached image exactly as it is.`;

  const bubbleSection = bubbleContext.length > 0 ? bubbleContext.join('. ') : '';
  const userAdditions = userPrompt?.trim() ?? '';
  const outroAnchor = `keep the visual integrity of the ${subjectClass} from the attached image exactly as it is`;

  const promptParts = [introAnchor];
  if (bubbleSection) {
    promptParts.push(`Style guidance: ${bubbleSection}`);
  }
  if (userAdditions) {
    promptParts.push(userAdditions);
  }
  promptParts.push(outroAnchor);

  const finalPrompt = promptParts.join('\n\n');

  return NextResponse.json({
    success: true,
    finalPrompt,
    matchedSceneType: sceneType || 'Custom',
    segments: {
      introAnchor,
      sceneNarrative: bubbleSection,
      userAdditions,
      outroAnchor,
    },
  });
});
