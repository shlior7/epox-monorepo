/**
 * Art Director Builder
 * Constructs 3-segment "sandwich" prompts for image generation
 * using the Pure Reference Constraint pattern.
 */

import type { SubjectAnalysis, BubbleValue, NativeSceneCategory, InputCameraAngle } from 'visualizer-types';

// ===== TYPES =====

export interface ArtDirectorInput {
  /** Product subject analysis (from product.analysisData.subject) */
  subjectAnalysis: SubjectAnalysis;

  /** Merged bubbles from all hierarchy levels */
  mergedBubbles: BubbleValue[];

  /** User's custom prompt additions */
  userPrompt?: string;

  /** Scene type for this generation */
  sceneType?: string;
}

export interface ArtDirectorResult {
  /** Final composed prompt */
  finalPrompt: string;

  /** Individual segments for debugging/display */
  segments: {
    introAnchor: string;
    sceneNarrative: string;
    userAdditions: string;
    outroAnchor: string;
  };
}

// ===== HELPER FUNCTIONS =====

/**
 * Derive environment type from scene category.
 */
function deriveEnvironmentType(category: NativeSceneCategory | undefined): string {
  switch (category) {
    case 'Indoor Room':
      return 'interior';
    case 'Outdoor Nature':
      return 'exterior';
    case 'Urban/Street':
      return 'exterior';
    case 'Studio':
      return 'studio';
    default:
      return 'interior';
  }
}

/**
 * Derive geometric description from camera angle.
 * This helps the image model understand perspective.
 */
function deriveGeometricDescription(cameraAngle: InputCameraAngle | undefined): string {
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
 * Extract style from bubbles.
 */
function extractStyle(bubbles: BubbleValue[]): string | undefined {
  for (const bubble of bubbles) {
    if (bubble.type === 'style') {
      return bubble.preset || bubble.customValue;
    }
  }
  return undefined;
}

/**
 * Extract lighting from bubbles.
 */
function extractLighting(bubbles: BubbleValue[]): string | undefined {
  for (const bubble of bubbles) {
    if (bubble.type === 'lighting') {
      return bubble.preset || bubble.customValue;
    }
  }
  return undefined;
}

/**
 * Extract mood from bubbles.
 */
function extractMood(bubbles: BubbleValue[]): string | undefined {
  for (const bubble of bubbles) {
    if (bubble.type === 'mood') {
      return bubble.preset;
    }
  }
  return undefined;
}

/**
 * Extract human interaction context from bubbles.
 */
function extractHumanInteraction(bubbles: BubbleValue[]): string | undefined {
  for (const bubble of bubbles) {
    if (bubble.type === 'human-interaction') {
      if (bubble.customValue) {
        return bubble.customValue;
      }
      switch (bubble.preset) {
        case 'none':
          return 'no people in the scene';
        case 'partial':
          return 'include partial human presence (hands or arms interacting with the product)';
        case 'full':
          return 'include a person naturally interacting with the product';
        case 'contextual':
          return 'include contextually appropriate human interaction';
        default:
          return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Extract props context from bubbles.
 */
function extractProps(bubbles: BubbleValue[]): string | undefined {
  for (const bubble of bubbles) {
    if (bubble.type === 'props') {
      if (bubble.customValue) {
        return `props and accessories: ${bubble.customValue}`;
      }
      switch (bubble.preset) {
        case 'none':
          return 'no props or accessories, product only';
        case 'minimal':
          return 'minimal, clean styling with few props';
        case 'styled':
          return 'carefully styled with curated props and accessories';
        case 'lifestyle':
          return 'natural lifestyle staging with lived-in feel';
        default:
          return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Extract background context from bubbles.
 */
function extractBackground(bubbles: BubbleValue[]): string | undefined {
  for (const bubble of bubbles) {
    if (bubble.type === 'background') {
      if (bubble.customValue) {
        return `background: ${bubble.customValue}`;
      }
      if (bubble.preset) {
        return `${bubble.preset} background`;
      }
    }
  }
  return undefined;
}

/**
 * Extract remaining bubble context (excluding already-handled types).
 */
function extractRemainingContext(bubbles: BubbleValue[]): string[] {
  const result: string[] = [];
  const handledTypes = new Set(['style', 'lighting', 'mood', 'human-interaction', 'props', 'background']);

  for (const bubble of bubbles) {
    if (handledTypes.has(bubble.type)) {
      continue;
    }

    switch (bubble.type) {
      case 'camera-angle':
        if (bubble.preset) {
          result.push(`shot from ${bubble.preset.toLowerCase()}`);
        }
        break;
      case 'color-palette':
        if (bubble.colors && bubble.colors.length > 0) {
          result.push(`color palette: ${bubble.colors.join(', ')}`);
        }
        break;
      case 'reference':
        if (bubble.image) {
          result.push('inspired by reference image');
        }
        break;
      case 'custom':
        if (bubble.value) {
          result.push(bubble.value);
        }
        break;
    }
  }

  return result;
}

// ===== MAIN BUILDER =====

/**
 * Build an art-director "sandwich" prompt.
 *
 * Structure:
 * - Segment A (Intro Anchor): Product identity preservation instruction
 * - Segment B (Scene Narrative): Quality framing + perspective + style + bubbles
 * - Segment C (User Additions): Optional custom prompt
 * - Segment D (Outro Anchor): Product integrity reinforcement
 *
 * Pure Reference Constraint: The product is referenced only by its generic name
 * (e.g., "Dining-Chair") without material/color/shape adjectives.
 */
export function buildArtDirectorPrompt(input: ArtDirectorInput): ArtDirectorResult {
  const { subjectAnalysis, mergedBubbles, userPrompt, sceneType } = input;

  // Get product class name (e.g., "Dining-Chair")
  const subjectClass = subjectAnalysis.subjectClassHyphenated || 'product';
  const environmentType = deriveEnvironmentType(subjectAnalysis.nativeSceneCategory);
  const geometricDescription = deriveGeometricDescription(subjectAnalysis.inputCameraAngle);

  // Scene context (from flow's sceneType or product's category)
  const sceneContext = sceneType || subjectAnalysis.nativeSceneCategory?.toLowerCase() || 'interior';

  // === SEGMENT A: INTRO ANCHOR ===
  // P0: Pure Reference Constraint — only use the generic class name
  // P1: Strengthened anchor with explicit attribute list
  const introAnchor = `Create an ${environmentType} ${subjectClass} scene with this ${subjectClass} from the attached image and keep the visual integrity of the ${subjectClass} from the attached image exactly as it is in terms of shape, size, proportion, material, color, texture, and camera angle. Do not alter any aspect of the ${subjectClass}; simply place it into the scene as described below.`;

  // === SEGMENT B: SCENE NARRATIVE ===
  const narrativeParts: string[] = [];

  // Quality framing
  narrativeParts.push(
    `Professional ${environmentType} ${sceneContext} photograph, editorial catalog style, ultra-realistic, 8k resolution.`
  );

  // Geometric perspective (P2)
  narrativeParts.push(geometricDescription);

  // Style from bubbles
  const style = extractStyle(mergedBubbles);
  if (style) {
    narrativeParts.push(`${style} style.`);
  }

  // Lighting from bubbles
  const lighting = extractLighting(mergedBubbles);
  if (lighting) {
    narrativeParts.push(`${lighting} lighting.`);
  }

  // Mood from bubbles
  const mood = extractMood(mergedBubbles);
  if (mood) {
    narrativeParts.push(`${mood} mood and atmosphere.`);
  }

  // Human interaction from bubbles
  const humanInteraction = extractHumanInteraction(mergedBubbles);
  if (humanInteraction) {
    narrativeParts.push(humanInteraction + '.');
  }

  // Props from bubbles
  const props = extractProps(mergedBubbles);
  if (props) {
    narrativeParts.push(props + '.');
  }

  // Background from bubbles
  const background = extractBackground(mergedBubbles);
  if (background) {
    narrativeParts.push(background + '.');
  }

  // Remaining bubble context
  const remainingContext = extractRemainingContext(mergedBubbles);
  if (remainingContext.length > 0) {
    narrativeParts.push(remainingContext.join('. ') + '.');
  }

  const sceneNarrative = narrativeParts.join(' ');

  // === SEGMENT C: USER ADDITIONS ===
  const userAdditions = userPrompt?.trim() || '';

  // === SEGMENT D: OUTRO ANCHOR ===
  // P1: Strengthened outro — mirror the explicit attribute list from intro
  const outroAnchor = `Keep the visual integrity of the ${subjectClass} from the attached image exactly as it is in terms of shape, size, proportion, material, color, texture, and camera angle. Do not change any aspect of the ${subjectClass}.`;

  // === COMPOSE FINAL PROMPT ===
  const promptParts = [introAnchor, sceneNarrative];
  if (userAdditions) {
    promptParts.push(userAdditions);
  }
  promptParts.push(outroAnchor);

  const finalPrompt = promptParts.join('\n\n');

  return {
    finalPrompt,
    segments: {
      introAnchor,
      sceneNarrative,
      userAdditions,
      outroAnchor,
    },
  };
}

/**
 * Build a simple prompt when subject analysis is not available.
 * Falls back to a less structured prompt.
 */
export function buildSimplePrompt(bubbles: BubbleValue[], userPrompt?: string): string {
  const parts: string[] = [];

  // Quality framing
  parts.push('Professional interior photograph, editorial catalog style, ultra-realistic, 8k resolution.');

  // Extract and add bubble context
  const style = extractStyle(bubbles);
  if (style) parts.push(`${style} style.`);

  const lighting = extractLighting(bubbles);
  if (lighting) parts.push(`${lighting} lighting.`);

  const mood = extractMood(bubbles);
  if (mood) parts.push(`${mood} mood and atmosphere.`);

  const humanInteraction = extractHumanInteraction(bubbles);
  if (humanInteraction) parts.push(humanInteraction + '.');

  const props = extractProps(bubbles);
  if (props) parts.push(props + '.');

  const background = extractBackground(bubbles);
  if (background) parts.push(background + '.');

  const remainingContext = extractRemainingContext(bubbles);
  if (remainingContext.length > 0) {
    parts.push(remainingContext.join('. ') + '.');
  }

  // User prompt
  if (userPrompt?.trim()) {
    parts.push(userPrompt.trim());
  }

  return parts.join(' ');
}
