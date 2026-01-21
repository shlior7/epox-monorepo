/**
 * Settings Types
 * All configuration and settings types for flows and generation
 */

// ===== POST ADJUSTMENTS =====

export interface LightAdjustments {
  exposure: number; // -100 to 100, default 0
  contrast: number; // -100 to 100, default 0
  highlights: number; // -100 to 100, default 0
  shadows: number; // -100 to 100, default 0
  whites: number; // -100 to 100, default 0
  blacks: number; // -100 to 100, default 0
}

export interface ColorAdjustments {
  temperature: number; // -100 to 100, default 0 (negative = cooler, positive = warmer)
  vibrance: number; // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
}

export interface EffectsAdjustments {
  texture: number; // -100 to 100, default 0
  clarity: number; // -100 to 100, default 0
  sharpness: number; // 0 to 100, default 0
}

export interface PostAdjustments {
  light: LightAdjustments;
  color: ColorAdjustments;
  effects: EffectsAdjustments;
}

export const DEFAULT_POST_ADJUSTMENTS: PostAdjustments = {
  light: {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
  },
  color: {
    temperature: 0,
    vibrance: 0,
    saturation: 0,
  },
  effects: {
    texture: 0,
    clarity: 0,
    sharpness: 0,
  },
};

// ===== PROMPT TAGS (Q&A Form) =====

export interface PromptTags {
  sceneType: string[];
  mood: string[];
  lighting: string[];
  style: string[];
  custom: string[];
}

export const DEFAULT_PROMPT_TAGS: PromptTags = {
  sceneType: [],
  mood: [],
  lighting: [],
  style: [],
  custom: [],
};

// ===== VIDEO SETTINGS =====

export type VideoResolution = '720p' | '1080p';
export type VideoAspectRatio = '16:9' | '9:16';

export interface VideoPromptSettings {
  videoType?: string;
  cameraMotion?: string;
  aspectRatio?: VideoAspectRatio;
  resolution?: VideoResolution;
  sound?: 'with_music' | 'no_sound' | 'automatic' | 'custom';
  soundPrompt?: string;
}

export const VIDEO_RESOLUTION_OPTIONS: VideoResolution[] = ['720p', '1080p'];
export const VIDEO_ASPECT_RATIO_OPTIONS: VideoAspectRatio[] = ['16:9', '9:16'];

export const VIDEO_TYPE_OPTIONS = ['product pan', 'orbit'] as const;
export const CAMERA_MOTION_OPTIONS = ['dolly', 'orbit', 'pan', 'tilt', 'static'] as const;

// ===== IMAGE ASPECT RATIO (Gemini supported) =====

export const IMAGE_ASPECT_RATIO_OPTIONS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'] as const;

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIO_OPTIONS)[number];
/**
 * Convert aspect ratio from colon format to slash format for display.
 * e.g., "16:9" -> "16/9"
 */
export function formatAspectRatioDisplay(ratio: string): string {
  return ratio.replace(':', '/');
}

export interface VideoGenerationSettings {
  prompt?: string;
  inspirationImageUrl?: string;
  inspirationNote?: string;
  settings: VideoPromptSettings;
  presetId?: string | null;
}

// ===== FLOW GENERATION SETTINGS =====

export interface FlowGenerationSettings {
  // ===== SCENE STYLE (Section 1) =====
  inspirationImages: InspirationImage[]; // Multiple images (raw uploads)
  sceneTypeInspirations?: SceneTypeInspirationMap; // Grouped by detected scene type
  stylePreset?: string; // Simple Mode dropdown or custom value
  lightingPreset?: string; // Simple Mode dropdown or custom value
  sceneType?: string; // Scene type selection or custom value

  // ===== USER PROMPT (Section 3) =====
  // User's additional details - gets APPENDED to generated prompt, not replacing it
  userPrompt?: string;

  // ===== OUTPUT SETTINGS (Section 4) =====
  aspectRatio: ImageAspectRatio;
  imageQuality?: ImageQuality;
  variantsCount?: number;

  // ===== VIDEO SETTINGS =====
  video?: VideoGenerationSettings;

  // ===== MODEL SETTINGS =====
  imageModel?: string;
  postAdjustments?: PostAdjustments;
}

export const DEFAULT_FLOW_SETTINGS: FlowGenerationSettings = {
  inspirationImages: [],
  sceneTypeInspirations: {},
  stylePreset: 'Modern Minimalist',
  lightingPreset: 'Studio Soft Light',
  aspectRatio: '1:1',
  imageQuality: '2k',
  userPrompt: '',
};

// ===== PROMPT SETTINGS (Legacy/Simple) =====

export interface PromptSettings {
  scene: string;
  style: string;
  lighting: string;
  surroundings: string;
  aspectRatio: string;
  numberOfVariants: number;
  customScene?: string;
  customStyle?: string;
  customLighting?: string;
  customSurroundings?: string;
}

export const DEFAULT_PROMPT_SETTINGS: PromptSettings = {
  scene: 'Studio Set',
  style: 'Modern Minimalist',
  lighting: 'Studio Soft Light',
  surroundings: 'Minimal (No Props)',
  aspectRatio: '1:1 (Square)',
  numberOfVariants: 1,
};

// ===== PROMPT TAG OPTIONS (suggested values for Q&A form) =====

export const PROMPT_TAG_OPTIONS = {
  sceneType: ['Living Room', 'Bedroom', 'Office', 'Kitchen', 'Dining Room', 'Bathroom', 'Outdoor', 'Studio'],
  mood: ['Cozy', 'Modern', 'Minimalist', 'Elegant', 'Rustic', 'Industrial', 'Bohemian', 'Luxurious'],
  lighting: ['Natural', 'Warm', 'Soft', 'Dramatic', 'Studio', 'Golden Hour', 'Cool', 'Ambient'],
  style: ['Scandinavian', 'Mid-Century Modern', 'Contemporary', 'Traditional', 'Art Deco', 'Farmhouse', 'Coastal', 'Japandi'],
} as const;

// ===== AI MODEL CONFIGURATION =====

export interface AIModelConfig {
  imageModel: string;
  fallbackImageModel?: string;
  textModel?: string;
  fallbackTextModel?: string;
  defaultQuality?: '1k' | '2k' | '4k';
}

// ===== COMMERCE CONFIGURATION =====

export type CommerceProvider = 'woocommerce' | 'shopify' | 'custom' | 'none';

export interface CommerceConfig {
  provider: CommerceProvider;
  baseUrl?: string;
  apiUrl?: string;
  consumerKey?: string;
  consumerSecret?: string;
  secretName?: string;
}

// ===== CLIENT METADATA =====

export interface ClientMetadata {
  description?: string;
  commerce?: CommerceConfig;
  aiModelConfig?: AIModelConfig;
}

// ===== FLOW STATUS =====

export type FlowStatus = 'empty' | 'configured' | 'generating' | 'completed' | 'error';

// ===== IMAGE QUALITY =====

export type ImageQuality = '1k' | '2k' | '4k';

/**
 * Normalize ImageQuality values for backward compatibility.
 * Converts legacy uppercase formats ('1K', '2K', '4K') to lowercase ('1k', '2k', '4k').
 */
export function normalizeImageQuality(value: string | undefined): ImageQuality | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.toLowerCase();
  if (normalized === '1k' || normalized === '2k' || normalized === '4k') {
    return normalized as ImageQuality;
  }
  return undefined;
}

// ===== SCENE CATEGORY =====

export type NativeSceneCategory = 'Indoor Room' | 'Outdoor Nature' | 'Urban/Street' | 'Studio';

// ===== CAMERA ANGLE =====

export type InputCameraAngle = 'Frontal' | 'Angled' | 'Top-Down' | 'Low Angle';

// ===== SUBJECT SCANNER OUTPUT (stored in product.analysis.subject) =====

export interface SubjectAnalysis {
  subjectClassHyphenated: string; // e.g., "Dining-Chair", "Serum-Bottle"
  nativeSceneTypes: string[]; // ARRAY: ["Living-Room", "Office", "Bedroom"]
  nativeSceneCategory: NativeSceneCategory;
  inputCameraAngle: InputCameraAngle;
  dominantColors?: string[]; // Optional: extracted palette
  materialTags?: string[]; // Optional: "wood", "metal", "fabric"
}

// ===== VISION SCANNER OUTPUT (per inspiration image) =====

export interface VisionAnalysisJson {
  styleSummary: string; // "A serene, cream-white Japandi bedroom..."
  detectedSceneType: string; // "Bedroom", "Office" - AI-detected from image
  heroObjectAccessories?: {
    identity: string;
    materialPhysics: string;
    placement: string;
  } | null;
  sceneInventory: Array<{
    identity: string; // "Back Wall", "Floor Lamp"
    geometry: string; // "Arched", "Tall and columnar"
    surfacePhysics: string; // "Rough hewn limestone"
    colorGrading: string; // "Warm terracotta"
    spatialContext: string; // "Framing the view"
  }>;
  lightingPhysics: {
    sourceDirection: string; // "Hard sunlight from top-left"
    shadowQuality: string; // "Long, sharp shadows"
    colorTemperature: string; // "Golden hour warm"
  };
}

export interface VisionAnalysisResult {
  json: VisionAnalysisJson;
  promptText: string; // Auto-generated text prompt for UI display
}

// ===== INSPIRATION IMAGE (with metadata) =====

export type InspirationSourceType = 'upload' | 'library' | 'stock' | 'unsplash';

export interface InspirationImage {
  url: string;
  thumbnailUrl?: string;
  tags?: string[]; // User-added or auto-detected tags
  addedAt: string; // ISO date
  sourceType: InspirationSourceType;
}

// ===== SCENE-TYPE GROUPED INSPIRATION (stored in flow settings) =====

export interface SceneTypeInspiration {
  inspirationImages: InspirationImage[]; // Images that match this scene type
  mergedAnalysis: VisionAnalysisResult; // Combined/dominant analysis for this scene type
}

export type SceneTypeInspirationMap = Record<string, SceneTypeInspiration>;

// ===== STYLE PRESET (for Simple Mode) =====

export type StylePreset =
  | 'Modern Minimalist'
  | 'Scandinavian'
  | 'Industrial'
  | 'Bohemian'
  | 'Mid-Century'
  | 'Rustic'
  | 'Coastal'
  | 'Luxurious'
  | 'Studio Clean';

export const STYLE_PRESETS: StylePreset[] = [
  'Modern Minimalist',
  'Scandinavian',
  'Industrial',
  'Bohemian',
  'Mid-Century',
  'Rustic',
  'Coastal',
  'Luxurious',
  'Studio Clean',
];

// ===== LIGHTING PRESET (for Simple Mode) =====

export type LightingPreset =
  | 'Natural Daylight'
  | 'Studio Soft Light'
  | 'Golden Hour'
  | 'Dramatic Shadow'
  | 'Bright & Airy'
  | 'Moody Low-Key'
  | 'Cool Overcast';

export const LIGHTING_PRESETS: LightingPreset[] = [
  'Natural Daylight',
  'Studio Soft Light',
  'Golden Hour',
  'Dramatic Shadow',
  'Bright & Airy',
  'Moody Low-Key',
  'Cool Overcast',
];
