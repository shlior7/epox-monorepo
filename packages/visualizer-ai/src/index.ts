// Configuration
export { createDefaultConfig, validateApiKeys } from './config';
export type { AIServiceConfig, GeminiConfig, OptimizationConfig } from './config';

// Constants
export {
  AI_MODELS,
  AVAILABLE_IMAGE_MODELS,
  AVAILABLE_TEXT_MODELS,
  DEFAULT_AI_MODEL_CONFIG,
  OPTIMIZATION_DEFAULTS,
  ERROR_MESSAGES,
  MATERIAL_KEYWORDS,
  COLOR_KEYWORDS,
  STYLE_MAP,
} from './constants';
export type {
  ModelTask,
  ModelApiType,
  ModelTier,
  ModelCapabilities,
  AIModelOption,
  TextModelOption,
} from './constants';

// Types
export type {
  AIModelOverrides,
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  EditImageRequest,
  EditImageResponse,
  ImageEditMode,
  ComponentAnalysisResult,
  SceneAnalysisResult,
  AdjustmentHint,
  ProductAsset,
  ProductAnalysis,
} from './types';

// Utils
export {
  fileToBase64,
  fileToGenerativePart,
  estimateTokenUsage,
  optimizePrompt,
  generateSessionId,
  parseSize,
  extractMaterials,
  extractColors,
  extractStyle,
  getDefaultAnalysisFromFileName,
  normalizeImageInput,
} from './utils';

// Gemini Service
export { GeminiService, getGeminiService } from './gemini-service';

