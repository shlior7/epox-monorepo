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

// ===== FLOW GENERATION SETTINGS =====

export interface FlowGenerationSettings {
  // Scene settings
  scene?: string; // Scene/backdrop name or 'Custom'
  sceneImageUrl?: string; // URL of the backdrop image
  customScene?: string;

  // Environment settings
  roomType: string;
  style: string;
  customStyle?: string;
  lighting: string;
  customLighting?: string;
  cameraAngle: string;
  aspectRatio: string;
  surroundings: string;
  customSurroundings?: string;
  colorScheme: string;
  props: string[];

  // Generation settings
  varietyLevel: number; // 0-100
  matchProductColors: boolean;
  includeAccessories: boolean;

  // Prompt settings
  promptText: string; // Auto-generated from settings above
  customPrompt?: string; // User-written override
  useCustomPrompt?: boolean; // Toggle: true = use customPrompt, false = use promptText

  // Model settings
  imageModel?: string; // AI model for image generation
  imageQuality?: '1k' | '2k' | '4k'; // Output image resolution
  postAdjustments?: PostAdjustments; // Post-processing adjustments
}

export const DEFAULT_FLOW_SETTINGS: FlowGenerationSettings = {
  scene: 'Studio Set',
  roomType: 'Studio Set',
  style: 'Modern Minimalist',
  lighting: 'Studio Soft Light',
  cameraAngle: 'Front',
  aspectRatio: '1:1',
  surroundings: 'Minimal (No Props)',
  colorScheme: 'Neutral',
  props: [],
  varietyLevel: 50,
  matchProductColors: true,
  includeAccessories: false,
  promptText: '',
  customPrompt: '',
  useCustomPrompt: false,
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

// Legacy alias for backward compatibility
export type OrganizationMetadata = ClientMetadata;

// ===== FLOW STATUS =====

export type FlowStatus = 'empty' | 'configured' | 'generating' | 'completed' | 'error';

// ===== IMAGE QUALITY =====

export type ImageQuality = '1k' | '2k' | '4k';
