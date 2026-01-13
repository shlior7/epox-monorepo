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
  COST_ESTIMATES,
  ERROR_MESSAGES,
  getModelsForTask,
  getModelsWithReferenceSupport,
  getModelsWithEditingSupport,
  getModelsForGeneration,
  selectBestModel,
  getUpgradeRecommendation,
  getModelById,
  modelSupportsCapability,
} from './constants';
export type {
  ModelTask,
  ModelApiType,
  ModelTier,
  ModelCapabilities,
  AIModelOption,
  TextModelOption,
  ModelSelectionContext,
} from './constants';

// Types
export type { ProductAsset, VisualizationRequest, VariantPreview, GenerationSession, ProductAnalysis } from './types';

// Utils
export { fileToBase64, fileToGenerativePart, estimateTokenUsage, optimizePrompt, generateSessionId, parseSize } from './utils';

// Gemini Service
export { GeminiService, getGeminiService } from './gemini';
export type {
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  EditImageRequest,
  EditImageResponse,
  ComponentAnalysisResult,
  SceneAnalysisResult,
  AdjustmentHint,
} from './gemini/types';

// Visualization Service
export { VisualizationService, getVisualizationService, visualizationService } from './visualization';

// Image Generation Service - Core types only (queue implementation is app-specific)
export type { ImageGenerationJob, ImageGenerationRequest, JobStatus } from './image-generation';
