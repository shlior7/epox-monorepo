/**
 * Art Director Builder
 * Constructs 3-segment "sandwich" prompts for image generation
 * using the Pure Reference Constraint pattern.
 */

import type { SubjectAnalysis, BubbleValue, NativeSceneCategory, InputCameraAngle } from 'visualizer-types';
import { getBubbleNarrative } from 'visualizer-types';

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

// ===== SMART PROMPT TYPES =====

export interface SmartPromptInput {
  productName: string;
  subjectClass?: string; // from analysisData.subject.subjectClassHyphenated
  productCategories?: string[];
  sceneType?: string;
  subjectAnalysis?: SubjectAnalysis; // optional — imported products may not have it yet
  mergedBubbles: BubbleValue[];
  userPrompt?: string;
}

export interface SmartPromptResult {
  finalPrompt: string;
  segments: {
    introAnchor: string;
    sceneDescription: string;
    outroAnchor: string;
  };
  layers: Record<string, string>; // Individual layer values for debugging
}

// ===== STYLE CASCADE =====

export const STYLE_CASCADE: Record<
  string,
  {
    lighting: string;
    colorPalette: string[];
    props: 'none' | 'minimal' | 'styled' | 'lifestyle';
  }
> = {
  Modern: { lighting: 'Studio Soft Light', colorPalette: ['#FFFFFF', '#1A1A1A', '#C0C0C0'], props: 'minimal' },
  Minimalist: { lighting: 'Natural Daylight', colorPalette: ['#FAFAFA', '#E0E0E0', '#2C2C2C'], props: 'none' },
  Industrial: { lighting: 'Dramatic Side Light', colorPalette: ['#3B3B3B', '#8B7355', '#A0A0A0'], props: 'minimal' },
  Scandinavian: { lighting: 'Natural Daylight', colorPalette: ['#F5F0EB', '#D4C5B2', '#6B8E7B'], props: 'minimal' },
  Bohemian: { lighting: 'Warm Evening', colorPalette: ['#C4723A', '#8B4513', '#DAA520', '#4A6741'], props: 'lifestyle' },
  'Mid-Century': { lighting: 'Golden Hour', colorPalette: ['#D2691E', '#FFD700', '#2F4F4F', '#F5DEB3'], props: 'styled' },
  Contemporary: { lighting: 'Studio Soft Light', colorPalette: ['#FFFFFF', '#333333', '#4A90D9'], props: 'styled' },
  Traditional: { lighting: 'Warm Evening', colorPalette: ['#8B0000', '#DAA520', '#2F2F2F', '#FFFFF0'], props: 'styled' },
  Rustic: { lighting: 'Morning Light', colorPalette: ['#8B7355', '#556B2F', '#D2B48C'], props: 'lifestyle' },
  Eclectic: { lighting: 'Natural Daylight', colorPalette: ['#FF6347', '#4169E1', '#FFD700', '#32CD32'], props: 'lifestyle' },
};

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
 * Check if a product description contains useful information
 * (not lorem ipsum, placeholder text, or HTML-only content).
 */
function isUsefulDescription(description: string): boolean {
  const lower = description.toLowerCase().trim();
  if (!lower || lower.length < 10) return false;

  // Detect lorem ipsum and common placeholder patterns
  const placeholderPatterns = [
    'lorem ipsum',
    'pellentesque habitant',
    'morbi tristique',
    'vestibulum tortor',
    'donec eu libero',
    'maecenas tempus',
    'nulla facilisi',
    'curabitur blandit',
    'sample product',
    'this is a placeholder',
    'description goes here',
    'add your description',
  ];

  for (const pattern of placeholderPatterns) {
    if (lower.includes(pattern)) return false;
  }

  // Skip if it's mostly HTML tags
  const stripped = description.replace(/<[^>]*>/g, '').trim();
  if (stripped.length < 10) return false;

  return true;
}

// ===== MAIN BUILDER =====

/**
 * Build an art-director "sandwich" prompt.
 *
 * @deprecated Use `buildSmartPrompt` instead — it handles both with and without subject analysis.
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

  // Bubble narratives
  const bubbleNarratives = mergedBubbles.map(getBubbleNarrative).filter((n): n is string => n !== null);
  narrativeParts.push(...bubbleNarratives.map((n) => (n.endsWith('.') ? n : n + '.')));

  const sceneNarrative = narrativeParts.join(' ');

  // === SEGMENT C: USER ADDITIONS ===
  const userAdditions = userPrompt?.trim() || '';

  // === SEGMENT D: OUTRO ANCHOR ===
  // P1: Strengthened outro — mirror the explicit attribute list from intro
  const outroAnchor = `Keep the visual integrity of the ${subjectClass} from the attached image exactly as it is in terms of shape, size, proportion, material, color, texture, and camera angle. Do not change any aspect of the ${subjectClass}. The ${subjectClass} should look naturally part of the scene`;

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
 * Product context for building prompts when subject analysis is unavailable.
 */
export interface ProductContext {
  productName: string;
  productDescription?: string | null;
  productCategory?: string | null;
  productCategories?: string[];
  sceneType?: string;
}

/**
 * Build a simple prompt when subject analysis is not available.
 * When product context is provided, includes product name, description,
 * categories, and scene type for a richer prompt.
 *
 * @deprecated Use `buildSmartPrompt` instead — it handles both with and without subject analysis.
 */
export function buildSimplePrompt(bubbles: BubbleValue[], userPrompt?: string, productContext?: ProductContext): string {
  const parts: string[] = [];

  // Product identity anchor (if context available)
  if (productContext) {
    const { productName, productDescription, productCategory, productCategories, sceneType } = productContext;

    // Build subject description
    const subjectParts: string[] = [];
    const categories = productCategories?.length ? productCategories.join(', ') : productCategory || undefined;
    if (categories) subjectParts.push(`(${categories})`);

    const subjectLine =
      subjectParts.length > 0
        ? `Create a scene featuring the "${productName}" ${subjectParts.join(' ')} from the attached product image.`
        : `Create a scene featuring the "${productName}" from the attached product image.`;
    parts.push(subjectLine);

    if (productDescription && isUsefulDescription(productDescription)) {
      // Include a brief description for context (truncate to ~200 chars)
      const brief = productDescription.length > 200 ? productDescription.slice(0, 200).trim() + '...' : productDescription;
      parts.push(`Product description: ${brief}`);
    }

    // Scene context
    const sceneLabel = sceneType || 'interior';
    parts.push(`Professional ${sceneLabel} photograph, editorial catalog style, ultra-realistic, 8k resolution.`);

    // Integrity instruction
    parts.push(
      'Keep the product exactly as it appears in the reference image — preserve its shape, proportions, materials, colors, and textures.'
    );
  } else {
    // No product context at all — generic framing
    parts.push('Professional interior photograph, editorial catalog style, ultra-realistic, 8k resolution.');
  }

  // Bubble narratives
  const bubbleNarratives = bubbles.map(getBubbleNarrative).filter((n): n is string => n !== null);
  parts.push(...bubbleNarratives.map((n) => (n.endsWith('.') ? n : n + '.')));

  // User prompt
  if (userPrompt?.trim()) {
    parts.push(userPrompt.trim());
  }

  return parts.join(' ');
}

// ===== SMART PROMPT BUILDER =====

/**
 * Build a smart 3-segment "sandwich" prompt with layered content and style cascade.
 *
 * Structure:
 * - Segment A (Intro Anchor): Product preservation instruction (high attention)
 * - Segment B (Scene Description): Smart layered content with cascade + user intent
 * - Segment C (Outro Anchor): Product preservation reinforcement
 *
 * Works with or without subject analysis data.
 */
export function buildSmartPrompt(input: SmartPromptInput): SmartPromptResult {
  const { productName, subjectClass, subjectAnalysis, mergedBubbles, userPrompt, sceneType } = input;

  const label = subjectClass || productName;
  const environmentType = deriveEnvironmentType(subjectAnalysis?.nativeSceneCategory);
  const geometricDescription = deriveGeometricDescription(subjectAnalysis?.inputCameraAngle);
  const sceneContext = sceneType || subjectAnalysis?.nativeSceneCategory?.toLowerCase() || 'interior';

  // Extract bubbles by type
  const styleBubble = mergedBubbles.find((b) => b.type === 'style');
  const lightingBubble = mergedBubbles.find((b) => b.type === 'lighting');
  const colorBubble = mergedBubbles.find((b) => b.type === 'color-palette');
  const humanBubble = mergedBubbles.find((b) => b.type === 'human-interaction');
  const propsBubble = mergedBubbles.find((b) => b.type === 'props');
  const backgroundBubble = mergedBubbles.find((b) => b.type === 'background');
  const cameraBubble = mergedBubbles.find((b) => b.type === 'camera-angle');
  const moodBubble = mergedBubbles.find((b) => b.type === 'mood');
  const customBubbles = mergedBubbles.filter((b) => b.type === 'custom');
  // Determine style name for cascade
  const styleName = styleBubble?.type === 'style' ? styleBubble.preset || styleBubble.customValue : undefined;
  const cascade = styleName ? STYLE_CASCADE[styleName] : undefined;

  // Check if human interaction is active (partial/full/contextual)
  const humanPreset = humanBubble?.type === 'human-interaction' ? humanBubble.preset : undefined;
  const isHumanInteraction = humanPreset === 'partial' || humanPreset === 'full' || humanPreset === 'contextual';

  // Determine design discipline
  const designDiscipline = environmentType === 'studio' ? 'studio photography' : `${environmentType} design`;

  const layers: Record<string, string> = {};

  // === SEGMENT A: INTRO ANCHOR ===
  let introAnchor: string;
  if (isHumanInteraction) {
    introAnchor = `Create an ${environmentType} ${label} scene with this ${label} from the attached image and keep the visual identity of the ${label} from the attached image — preserve its design, colors, and branding. The product should integrate naturally into the scene:`;
  } else {
    introAnchor = `Create an ${environmentType} ${label} scene with this ${label} from the attached image and keep the visual integrity of the ${label} from the attached image exactly as it is in terms of shape and size and proportion and material and color and camera angle, with the exact camera angle as in the attached image, do not change any aspect of the ${label} as it is in the attached image, and simply place this ${label} at the scene as described:`;
  }
  layers['introAnchor'] = introAnchor;

  // === SEGMENT B: SCENE DESCRIPTION (ordered layers) ===
  const sceneParts: string[] = [];

  // 1. Quality framing
  sceneParts.push(`Professional ${designDiscipline} of a ${sceneContext}`);
  layers['qualityFraming'] = sceneParts[sceneParts.length - 1];

  // 2. Camera/geometric description
  const cameraDesc = cameraBubble ? getBubbleNarrative(cameraBubble) : null;
  const geoDesc = cameraDesc || geometricDescription;
  sceneParts.push(geoDesc);
  layers['camera'] = geoDesc;

  // 3. Style + Mood
  const styleNarrative = styleBubble ? getBubbleNarrative(styleBubble) : null;
  if (styleNarrative) {
    sceneParts.push(styleNarrative);
    layers['style'] = styleNarrative;
  }
  const moodNarrative = moodBubble ? getBubbleNarrative(moodBubble) : null;
  if (moodNarrative) {
    sceneParts.push(moodNarrative);
    layers['mood'] = moodNarrative;
  }

  // 4. Lighting (from bubble, or cascaded from style preset)
  const lightingNarrative = lightingBubble ? getBubbleNarrative(lightingBubble) : null;
  if (lightingNarrative) {
    sceneParts.push(lightingNarrative);
    layers['lighting'] = lightingNarrative;
  } else if (cascade?.lighting) {
    const cascadedLighting = `${cascade.lighting} lighting`;
    sceneParts.push(cascadedLighting);
    layers['lighting'] = `${cascadedLighting} (cascaded from ${styleName})`;
  }

  // 5. Color palette (from bubble, or cascaded from style preset)
  const colorNarrative = colorBubble ? getBubbleNarrative(colorBubble) : null;
  if (colorNarrative) {
    sceneParts.push(colorNarrative);
    layers['colorPalette'] = colorNarrative;
  } else if (cascade?.colorPalette) {
    const cascadedColor = `color palette: ${cascade.colorPalette.join(', ')}`;
    sceneParts.push(cascadedColor);
    layers['colorPalette'] = `${cascadedColor} (cascaded from ${styleName})`;
  }

  // 6. Background/environment
  const bgNarrative = backgroundBubble ? getBubbleNarrative(backgroundBubble) : null;
  if (bgNarrative) {
    sceneParts.push(bgNarrative);
    layers['background'] = bgNarrative;
  }

  // 7. Human interaction narrative
  const humanNarrative = humanBubble ? getBubbleNarrative(humanBubble) : null;
  if (humanNarrative) {
    sceneParts.push(humanNarrative);
    layers['humanInteraction'] = humanNarrative;
  }

  // 8. Props narrative (from bubble, or cascaded from style preset)
  const propsNarrative = propsBubble ? getBubbleNarrative(propsBubble) : null;
  if (propsNarrative) {
    sceneParts.push(propsNarrative);
    layers['props'] = propsNarrative;
  } else if (cascade?.props) {
    const cascadedProps = getBubbleNarrative({ type: 'props', preset: cascade.props });
    if (cascadedProps) {
      sceneParts.push(cascadedProps);
      layers['props'] = `${cascadedProps} (cascaded from ${styleName})`;
    }
  }

  // 9. Custom bubble narratives
  for (const custom of customBubbles) {
    const n = getBubbleNarrative(custom);
    if (n) sceneParts.push(n);
  }

  // 10. User prompt (placed in Segment B for strong weighting)
  if (userPrompt?.trim()) {
    sceneParts.push(userPrompt.trim());
    layers['userPrompt'] = userPrompt.trim();
  }

  // 11. Technical boosters
  sceneParts.push('professional product photograph, editorial catalog quality, ultra-realistic, 8k resolution, sharp focus');

  const sceneDescription = sceneParts.filter(Boolean).join('. ') + '.';

  // === SEGMENT C: OUTRO ANCHOR ===
  let outroAnchor: string;
  if (isHumanInteraction) {
    outroAnchor = `keep the visual identity of the ${label} from the attached image — preserve its design, colors, and branding. The product should integrate naturally into the scene`;
  } else {
    outroAnchor = `keep the visual integrity of the ${label} from the attached image exactly as it is in terms of shape and size and proportion and material and color and camera angle, with the exact camera angle as in the attached image, do not change any aspect of the ${label} as it is in the attached image, and simply place this ${label} at the scene as described`;
  }
  layers['outroAnchor'] = outroAnchor;

  const finalPrompt = [introAnchor, sceneDescription, outroAnchor].join('\n\n');

  return {
    finalPrompt,
    segments: { introAnchor, sceneDescription, outroAnchor },
    layers,
  };
}
