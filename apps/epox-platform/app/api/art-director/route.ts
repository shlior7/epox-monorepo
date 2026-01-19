/**
 * API Route: Art Director
 * Constructs the 3-segment prompt for image generation
 * by merging product subject analysis with inspiration scene analysis
 */

import { NextResponse } from 'next/server';
import type {
  SubjectAnalysis,
  SceneTypeInspirationMap,
  StylePreset,
  LightingPreset,
  VisionAnalysisResult,
} from 'visualizer-types';
import { withSecurity } from '@/lib/security';

// ===== REQUEST/RESPONSE TYPES =====

interface ArtDirectorRequest {
  subjectAnalysis?: SubjectAnalysis;
  sceneTypeInspirations?: SceneTypeInspirationMap;
  stylePreset?: StylePreset;
  lightingPreset?: LightingPreset;
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
 * Logic 3: Scene Type Matching
 * Finds the best matching inspiration for the product's native scene types
 */
function findMatchingInspiration(
  productSceneTypes: string[],
  sceneTypeInspirations: SceneTypeInspirationMap | undefined = {}
): { matchedSceneType: string; analysis: VisionAnalysisResult } | null {
  const availableSceneTypes = Object.keys(sceneTypeInspirations);

  if (availableSceneTypes.length === 0) {
    return null;
  }

  // Find intersection of product scene types and available inspirations
  for (const productSceneType of productSceneTypes) {
    // Try exact match first
    if (sceneTypeInspirations[productSceneType]) {
      return {
        matchedSceneType: productSceneType,
        analysis: sceneTypeInspirations[productSceneType].mergedAnalysis,
      };
    }

    // Try case-insensitive match
    const match = availableSceneTypes.find(
      (available) => available.toLowerCase() === productSceneType.toLowerCase()
    );
    if (match) {
      return {
        matchedSceneType: match,
        analysis: sceneTypeInspirations[match].mergedAnalysis,
      };
    }
  }

  // No match found - use the first available inspiration
  const firstSceneType = availableSceneTypes[0];
  return {
    matchedSceneType: firstSceneType,
    analysis: sceneTypeInspirations[firstSceneType].mergedAnalysis,
  };
}

/**
 * Builds the scene narrative (Segment B) from vision analysis
 */
function buildSceneNarrative(
  subjectClass: string,
  nativeSceneType: string,
  designDiscipline: string,
  geometricDescription: string,
  visionAnalysis: VisionAnalysisResult,
  stylePreset?: StylePreset,
  lightingPreset?: LightingPreset
): string {
  const parts: string[] = [];

  // The Stage
  const styleDesc = stylePreset ? `, styled in ${stylePreset} aesthetic` : '';
  parts.push(
    `Professional ${designDiscipline} of a ${nativeSceneType}${styleDesc}. ${visionAnalysis.json.styleSummary} Ultra-realistic, 8k resolution, highly detailed texture. ${geometricDescription}`
  );

  // The Shell (walls and floor from scene inventory)
  const walls = visionAnalysis.json.sceneInventory.find((item) =>
    item.identity.toLowerCase().includes('wall')
  );
  const floor = visionAnalysis.json.sceneInventory.find(
    (item) =>
      item.identity.toLowerCase().includes('floor') ||
      item.identity.toLowerCase().includes('ground')
  );

  if (walls || floor) {
    const shellParts: string[] = [];
    if (walls) {
      shellParts.push(`The ${walls.identity} are finished in ${walls.surfacePhysics}`);
    }
    if (floor) {
      shellParts.push(`the ${floor.identity} is ${floor.surfacePhysics}`);
    }
    parts.push(`${shellParts.join(' and ')}.`);
  }

  // The Styling (hero accessories)
  if (visionAnalysis.json.heroObjectAccessories) {
    const acc = visionAnalysis.json.heroObjectAccessories;
    parts.push(
      `Adorning the ${subjectClass}, ${acc.identity} made of ${acc.materialPhysics} is ${acc.placement}.`
    );
  }

  // The Specifics (scene inventory props)
  const props = visionAnalysis.json.sceneInventory.filter(
    (item) =>
      !item.identity.toLowerCase().includes('wall') &&
      !item.identity.toLowerCase().includes('floor') &&
      !item.identity.toLowerCase().includes('ground') &&
      !item.identity.toLowerCase().includes('ceiling')
  );

  for (const prop of props.slice(0, 5)) {
    parts.push(
      `A ${prop.identity} ${prop.geometry} made of ${prop.surfacePhysics} is positioned ${prop.spatialContext}.`
    );
  }

  // The Atmosphere
  const lighting = visionAnalysis.json.lightingPhysics;
  const lightingDesc = lightingPreset
    ? `${lightingPreset} lighting with ${lighting.sourceDirection}`
    : `The lighting is defined by ${lighting.sourceDirection}`;
  parts.push(
    `${lightingDesc}, casting ${lighting.shadowQuality}. The atmosphere follows a ${lighting.colorTemperature} palette.`
  );

  return parts.join(' ');
}

// ===== MAIN HANDLER =====

export const POST = withSecurity(async (request): Promise<NextResponse<ArtDirectorResponse>> => {
  const body: ArtDirectorRequest = await request.json();

  const { subjectAnalysis, sceneTypeInspirations, stylePreset, lightingPreset, userPrompt } = body;

  if (!subjectAnalysis) {
    return NextResponse.json({ success: false, error: 'Missing subjectAnalysis' }, { status: 400 });
  }

  // Find matching inspiration for this product
  const match = findMatchingInspiration(subjectAnalysis.nativeSceneTypes, sceneTypeInspirations);

  if (!match) {
    return NextResponse.json(
      { success: false, error: 'No inspiration images available for scene type matching' },
      { status: 400 }
    );
  }

  const { matchedSceneType, analysis: visionAnalysis } = match;
  const subjectClass = subjectAnalysis.subjectClassHyphenated;

  // Derive context variables
  const { environmentType, designDiscipline } = deriveEnvironmentContext(
    subjectAnalysis.nativeSceneCategory
  );
  const geometricDescription = deriveGeometricDescription(subjectAnalysis.inputCameraAngle);

  // Build the 3 segments
  const introAnchor = `Create an ${environmentType} ${subjectClass} scene with this ${subjectClass} from the attached image and keep the visual integrity of the ${subjectClass} from the attached image exactly as it is in terms of shape and size and proportion and material and color and camera angle, with the exact camera angle as in the attached image, do not change any aspect of the ${subjectClass} as it is in the attached image, and simply place this ${subjectClass} at the scene as described:`;

  const sceneNarrative = buildSceneNarrative(
    subjectClass,
    matchedSceneType,
    designDiscipline,
    geometricDescription,
    visionAnalysis,
    stylePreset,
    lightingPreset
  );

  // User additions (appended, not replacing)
  const userAdditions = userPrompt?.trim() ?? '';

  const outroAnchor = `keep the visual integrity of the ${subjectClass} from the attached image exactly as it is in terms of shape and size and proportion and material and color and camera angle, with the exact camera angle as in the attached image, do not change any aspect of the ${subjectClass} as it is in the attached image, and simply place this ${subjectClass} at the scene as described`;

  // Combine segments into final prompt
  const promptParts = [introAnchor, sceneNarrative];
  if (userAdditions) {
    promptParts.push(userAdditions);
  }
  promptParts.push(outroAnchor);

  const finalPrompt = promptParts.join('\n\n');

  return NextResponse.json({
    success: true,
    finalPrompt,
    matchedSceneType,
    segments: {
      introAnchor,
      sceneNarrative,
      userAdditions,
      outroAnchor,
    },
  });
});
