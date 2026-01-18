// ===== AI MODEL CONSTANTS =====

export const AI_MODELS = {
  // Default models for different tasks
  IMAGE: 'gemini-2.5-flash-image', // Gemini models for all image generation
  IMAGE_EDIT: 'gemini-3-pro-image-preview', // Best for editing with reasoning
  IMAGE_WITH_REFERENCE: 'gemini-2.5-flash-image', // Supports multimodal references
  FALLBACK_IMAGE: 'gemini-2.5-flash-image', // Fallback for generation
  TEXT: 'gemini-2.5-flash-lite',
  FALLBACK_TEXT: 'gemini-2.0-flash-lite',
} as const;

// ===== MODEL CAPABILITY SYSTEM =====

/** Task types that models can perform */
export type ModelTask = 'generation' | 'editing' | 'editing_with_reference' | 'generation_with_reference';

/** API type determines which SDK method to use */
export type ModelApiType = 'gemini';

/** Quality/price tier for upgrade recommendations */
export type ModelTier = 'economy' | 'standard' | 'premium' | 'ultra';

/** Model capabilities definition */
export interface ModelCapabilities {
  supportsTextToImage: boolean;
  supportsReferenceImages: boolean;
  supportsEditing: boolean;
  supportsMaskEditing: boolean;
  supportsMaskFreeEditing: boolean;
  supportsUpscaling: boolean;
  maxReferenceImages?: number;
}

/** Complete model definition */
export interface AIModelOption {
  id: string;
  name: string;
  description: string;
  type: 'image' | 'text';
  costPerImage: number; // USD
  speed: 'fast' | 'standard' | 'slow';
  quality: 'standard' | 'high' | 'ultra';
  apiType: ModelApiType;
  tier: ModelTier;
  capabilities: ModelCapabilities;
  /** Models to recommend upgrading to for better results */
  upgradeRecommendations?: string[];
  /** When to show this model (helps with smart filtering) */
  recommendedFor: ModelTask[];
}

// ===== IMAGE GENERATION MODELS =====
export const AVAILABLE_IMAGE_MODELS: AIModelOption[] = [
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro Image',
    description: 'Best quality + reasoning for editing',
    type: 'image',
    costPerImage: 0.08,
    speed: 'slow',
    quality: 'ultra',
    apiType: 'gemini',
    tier: 'premium',
    capabilities: {
      supportsTextToImage: true,
      supportsReferenceImages: true,
      supportsEditing: true,
      supportsMaskEditing: false,
      supportsMaskFreeEditing: true,
      supportsUpscaling: false,
      maxReferenceImages: 14,
    },
    recommendedFor: ['generation', 'generation_with_reference', 'editing', 'editing_with_reference'],
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    description: 'Fast multimodal, great with references',
    type: 'image',
    costPerImage: 0.04,
    speed: 'fast',
    quality: 'standard',
    apiType: 'gemini',
    tier: 'standard',
    capabilities: {
      supportsTextToImage: true,
      supportsReferenceImages: true,
      supportsEditing: true,
      supportsMaskEditing: false,
      supportsMaskFreeEditing: true,
      supportsUpscaling: false,
      maxReferenceImages: 10,
    },
    upgradeRecommendations: ['gemini-3-pro-image-preview'],
    recommendedFor: ['generation', 'generation_with_reference', 'editing', 'editing_with_reference'],
  },
];

// Text models
export interface TextModelOption {
  id: string;
  name: string;
  description: string;
  type: 'text';
  speed: 'fast' | 'standard' | 'slow';
  quality: 'standard' | 'high' | 'ultra';
}

export const AVAILABLE_TEXT_MODELS: TextModelOption[] = [
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Fast and cost-effective',
    type: 'text',
    speed: 'fast',
    quality: 'standard',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    description: 'Reliable fallback option',
    type: 'text',
    speed: 'fast',
    quality: 'standard',
  },
];

// ===== DEFAULT AI MODEL CONFIGURATION =====
export const DEFAULT_AI_MODEL_CONFIG = {
  imageModel: AI_MODELS.IMAGE,
  editModel: AI_MODELS.IMAGE_EDIT,
  fallbackImageModel: AI_MODELS.FALLBACK_IMAGE,
  textModel: AI_MODELS.TEXT,
  fallbackTextModel: AI_MODELS.FALLBACK_TEXT,
};

// ===== OPTIMIZATION DEFAULTS =====
export const OPTIMIZATION_DEFAULTS = {
  MAX_PROMPT_TOKENS: 1000,
  DEFAULT_IMAGE_COUNT: 1,
  DEFAULT_IMAGE_SIZE: '1024x1024',
  DEFAULT_ASPECT_RATIO: '1:1',
  MAX_RETRIES: 2,
};

// ===== ERROR MESSAGES =====
export const ERROR_MESSAGES = {
  MISSING_API_KEY: 'Missing required API key: GOOGLE_AI_STUDIO_API_KEY or GEMINI_API_KEY',
  NO_IMAGE_DATA: 'No image data in response',
  GENERATION_FAILED: 'Image generation failed',
  EDIT_FAILED: 'Image editing failed',
  ANALYSIS_FAILED: 'Image analysis failed',
};

// ===== GEMINI-SPECIFIC CONSTANTS =====
export const MATERIAL_KEYWORDS = [
  'wood',
  'metal',
  'plastic',
  'glass',
  'fabric',
  'leather',
  'stone',
  'ceramic',
  'steel',
  'aluminum',
] as const;

export const COLOR_KEYWORDS = [
  'white',
  'black',
  'gray',
  'brown',
  'blue',
  'red',
  'green',
  'yellow',
  'orange',
  'purple',
  'pink',
  'beige',
  'silver',
  'gold',
] as const;

export const STYLE_MAP = {
  modern: 'modern',
  contemporary: 'contemporary',
  vintage: 'vintage',
  industrial: 'industrial',
  minimalist: 'minimalist',
  classic: 'classic',
  rustic: 'rustic',
  scandinavian: 'scandinavian',
} as const;

