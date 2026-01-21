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
  COST_ESTIMATES,
  MATERIAL_KEYWORDS,
  COLOR_KEYWORDS,
  STYLE_MAP,
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
  AIModelConfig,
} from './constants';

// Types
export type {
  AIModelOverrides,
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  GeminiVideoRequest,
  GeminiVideoResponse,
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

// Logging
export { createLogger, defaultLogger, initSentry, Logger } from './logger';
export type { LogContext, LogLevel } from './logger';

// Cost Tracking
export { initCostTracking, getCostTracker, isCostTrackingInitialized, trackAIOperation, CostTracker } from './cost-tracker';

// Product Analysis Service
export { ProductAnalysisService, getProductAnalysisService } from './product-analysis';
export type {
  ProductAnalysisInput,
  ProductAnalysisResult,
  BatchAnalysisResult,
  AnalysisOptions,
  AIAnalysisResult,
  ColorScheme,
  ProductSize,
} from './product-analysis';

// Generation Queue Facade
export { enqueueImageGeneration, enqueueVideoGeneration, enqueueImageEdit, getJobStatus, getJobsByFlow } from './generation-queue';
export type { EnqueueImageResult, EnqueueVideoResult, JobStatusResult } from './generation-queue';
export type {
  ImageGenerationPayload,
  ImageEditPayload,
  VideoGenerationPayload,
  JobResult,
  JobStatus,
  JobType,
  PromptTags,
} from 'visualizer-db/schema';

// Rate Limiting
export {
  withRateLimit,
  checkRateLimit,
  resetRateLimiters,
  RateLimitError,
  getRateLimitInfo,
  setModelRateLimit,
  setCategoryRateLimit,
  getAllRateLimits,
  initRedisRateLimiter,
} from './rate-limit';
export type { RateLimitResult, RateLimitConfig, RedisClient } from './rate-limit';
