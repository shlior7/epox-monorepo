import { DEFAULT_AI_MODEL_CONFIG, OPTIMIZATION_DEFAULTS } from './services/shared/constants';

// Configuration for AI services - models are defined in constants.ts (single source of truth)
export const AI_CONFIG = {
  gemini: {
    apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
    endpoint: process.env.GEMINI_API_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta',
    // Model configuration from constants.ts - see AVAILABLE_IMAGE_MODELS for full details
    imageModel: DEFAULT_AI_MODEL_CONFIG.imageModel,
    editModel: DEFAULT_AI_MODEL_CONFIG.editModel,
    fallbackImageModel: DEFAULT_AI_MODEL_CONFIG.fallbackImageModel,
    textModel: DEFAULT_AI_MODEL_CONFIG.textModel,
    fallbackTextModel: DEFAULT_AI_MODEL_CONFIG.fallbackTextModel,
  },
  // Cost optimization settings
  optimization: {
    maxPromptTokens: OPTIMIZATION_DEFAULTS.MAX_PROMPT_TOKENS,
    defaultImageCount: OPTIMIZATION_DEFAULTS.DEFAULT_IMAGE_COUNT,
    defaultImageSize: OPTIMIZATION_DEFAULTS.DEFAULT_IMAGE_SIZE,
    defaultAspectRatio: OPTIMIZATION_DEFAULTS.DEFAULT_ASPECT_RATIO,
    maxRetries: OPTIMIZATION_DEFAULTS.MAX_RETRIES,
    enableBatchRequests: true,
    enableContextCaching: true,
    useFreeTierWhenPossible: true,
  },
} as const;

// Validation
export function validateApiKeys() {
  const missing = [];

  if (!AI_CONFIG.gemini.apiKey) {
    missing.push('GOOGLE_AI_STUDIO_API_KEY or GEMINI_API_KEY');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
