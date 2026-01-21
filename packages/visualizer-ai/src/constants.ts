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

// ===== SMART MODEL SELECTION HELPERS =====

/** Context for smart model selection */
export interface ModelSelectionContext {
  task: ModelTask;
  hasReferenceImages: boolean;
  referenceImageCount?: number;
  preferSpeed?: boolean;
  preferQuality?: boolean;
  maxBudgetPerImage?: number;
}

/**
 * Get models filtered by task and capabilities
 */
export function getModelsForTask(task: ModelTask): AIModelOption[] {
  return AVAILABLE_IMAGE_MODELS.filter((model) => model.recommendedFor.includes(task));
}

/**
 * Get models that support reference images
 */
export function getModelsWithReferenceSupport(): AIModelOption[] {
  return AVAILABLE_IMAGE_MODELS.filter((model) => model.capabilities.supportsReferenceImages);
}

/**
 * Get models that support editing
 */
export function getModelsWithEditingSupport(): AIModelOption[] {
  return AVAILABLE_IMAGE_MODELS.filter((model) => model.capabilities.supportsEditing);
}

/**
 * Get models that support text-to-image generation
 */
export function getModelsForGeneration(): AIModelOption[] {
  return AVAILABLE_IMAGE_MODELS.filter((model) => model.capabilities.supportsTextToImage);
}

/**
 * Smart model selection based on context
 * Returns the best model for the given context, with fallback options
 */
export function selectBestModel(context: ModelSelectionContext): {
  recommended: AIModelOption;
  alternatives: AIModelOption[];
  reason: string;
} {
  let candidates = AVAILABLE_IMAGE_MODELS.filter((m) => m.recommendedFor.includes(context.task));

  // Filter by reference image support if needed
  if (context.hasReferenceImages) {
    candidates = candidates.filter((m) => m.capabilities.supportsReferenceImages);

    // Further filter by max reference images if specified
    if (context.referenceImageCount) {
      candidates = candidates.filter(
        (m) => !m.capabilities.maxReferenceImages || m.capabilities.maxReferenceImages >= context.referenceImageCount!
      );
    }
  }

  // Filter by budget if specified
  if (context.maxBudgetPerImage) {
    candidates = candidates.filter((m) => m.costPerImage <= context.maxBudgetPerImage!);
  }

  // Sort by preference
  if (context.preferSpeed) {
    candidates.sort((a, b) => {
      const speedOrder = { fast: 0, standard: 1, slow: 2 };
      return speedOrder[a.speed] - speedOrder[b.speed];
    });
  } else if (context.preferQuality) {
    candidates.sort((a, b) => {
      const qualityOrder = { standard: 0, high: 1, ultra: 2 };
      return qualityOrder[b.quality] - qualityOrder[a.quality];
    });
  } else {
    // Default: balance cost and quality (tier-based)
    candidates.sort((a, b) => {
      const tierOrder = { economy: 0, standard: 1, premium: 2, ultra: 3 };
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
  }

  if (candidates.length === 0) {
    // Fallback to Gemini Flash which supports everything
    const fallback = AVAILABLE_IMAGE_MODELS.find((m) => m.id === 'gemini-2.5-flash-image');
    if (!fallback) {
      // If fallback is not found, use the first available model
      const firstModel = AVAILABLE_IMAGE_MODELS[0];
      if (!firstModel) {
        throw new Error('No image models available');
      }
      return {
        recommended: firstModel,
        alternatives: [],
        reason: `No models match your criteria. Using ${firstModel.name} as fallback.`,
      };
    }
    return {
      recommended: fallback,
      alternatives: [],
      reason: 'No models match your criteria. Using Gemini 2.5 Flash Image as fallback.',
    };
  }

  const recommended = candidates[0];
  const alternatives = candidates.slice(1, 4); // Top 3 alternatives

  let reason = '';
  if (context.hasReferenceImages) {
    reason = `Selected ${recommended.name} because it supports reference images.`;
  } else if (context.task === 'editing') {
    reason = `Selected ${recommended.name} for editing capabilities.`;
  } else if (context.preferSpeed) {
    reason = `Selected ${recommended.name} for fastest generation.`;
  } else if (context.preferQuality) {
    reason = `Selected ${recommended.name} for highest quality.`;
  } else {
    reason = `Selected ${recommended.name} for best value.`;
  }

  return { recommended, alternatives, reason };
}

/**
 * Get upgrade recommendation for a model
 */
export function getUpgradeRecommendation(currentModelId: string): AIModelOption | null {
  const currentModel = AVAILABLE_IMAGE_MODELS.find((m) => m.id === currentModelId);
  if (!currentModel?.upgradeRecommendations?.length) return null;

  const upgradeId = currentModel.upgradeRecommendations[0];
  return AVAILABLE_IMAGE_MODELS.find((m) => m.id === upgradeId) || null;
}

/**
 * Get model by ID
 */
export function getModelById(modelId: string): AIModelOption | undefined {
  return AVAILABLE_IMAGE_MODELS.find((m) => m.id === modelId);
}

/**
 * Check if a model supports a specific capability
 */
export function modelSupportsCapability(modelId: string, capability: keyof ModelCapabilities): boolean {
  const model = getModelById(modelId);
  if (!model) return false;
  return Boolean(model.capabilities[capability]);
}

// ===== DEFAULT AI MODEL CONFIGURATION =====
export const DEFAULT_AI_MODEL_CONFIG = {
  imageModel: AI_MODELS.IMAGE,
  editModel: AI_MODELS.IMAGE_EDIT,
  fallbackImageModel: AI_MODELS.FALLBACK_IMAGE,
  textModel: AI_MODELS.TEXT,
  fallbackTextModel: AI_MODELS.FALLBACK_TEXT,
};
export type AIModelConfig = typeof DEFAULT_AI_MODEL_CONFIG;

// ===== OPTIMIZATION DEFAULTS =====
export const OPTIMIZATION_DEFAULTS = {
  MAX_PROMPT_TOKENS: 1000,
  DEFAULT_IMAGE_COUNT: 1,
  DEFAULT_IMAGE_SIZE: '1024x1024',
  DEFAULT_ASPECT_RATIO: '1:1',
  MAX_RETRIES: 2,
};

// ===== COST ESTIMATES =====
export const COST_ESTIMATES = {
  IMAGE_GENERATION: 0.001,
  TEXT_ANALYSIS: 0.0001,
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
