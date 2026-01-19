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

// Gemini Service - Re-exported from visualizer-ai for backwards compatibility
export {
  GeminiService,
  getGeminiService,
} from 'visualizer-ai';
export type {
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  GeminiVideoRequest,
  GeminiVideoResponse,
  EditImageRequest,
  EditImageResponse,
  ComponentAnalysisResult,
  SceneAnalysisResult,
  AdjustmentHint,
  VisionScannerOutput,
  SubjectScannerOutput,
} from 'visualizer-ai';

// Visualization Service
export { VisualizationService, getVisualizationService, visualizationService } from './visualization';

// Image Generation Service
export type { ImageGenerationJob, ImageGenerationRequest, JobStatus } from './image-generation';
export {
  ImageGenerationQueueService,
  getImageGenerationQueueService,
  resetImageGenerationQueueService,
} from './image-generation';
export type { ImageGenerationQueueConfig, QueueStats } from './image-generation';

// Invitation Service
export { InvitationService, getInvitationService, resetInvitationService } from './invitation';
export type {
  InvitationServiceConfig,
  InvitationTokenPayload,
  CreateInvitationRequest,
  AcceptInvitationRequest,
  InvitationDetails,
} from './invitation';

// Email Service
export { EmailService, getEmailService, resetEmailService } from './email';
export type {
  EmailServiceConfig,
  EmailAddress,
  SendEmailRequest,
  SendEmailResult,
  InvitationEmailPayload,
  GenerationCompletedEmailPayload,
  GenerationFailedEmailPayload,
  PasswordResetEmailPayload,
  WeeklyUsageSummaryPayload,
} from './email';

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

// Inspiration Image Service
export { InspirationService, getInspirationService, resetInspirationService } from './inspiration';
export type {
  InspirationServiceConfig,
  InspirationImage,
  SceneAnalysisResult as InspirationSceneAnalysis,
  UnsplashSearchParams,
  UnsplashImage,
  UnsplashSearchResult,
  MergedInspirationSettings,
} from './inspiration';

// Flow Orchestration Service
export {
  FlowOrchestrationService,
  getFlowOrchestrationService,
  resetFlowOrchestrationService,
  buildPromptFromTags,
  buildPromptFromContext,
  generatePromptVariations,
} from './flow-orchestration';
export type {
  FlowOrchestrationServiceConfig,
  CreateFlowRequest,
  FlowCreationResult,
  PerProductSettings,
  PromptBuilderContext,
} from './flow-orchestration';

// Quota Service
export { QuotaService, createQuotaService, PLAN_LIMITS } from './quota';
export type {
  QuotaServiceDependencies,
  PlanType,
  PlanLimits,
  QuotaStatus,
  QuotaCheckResult,
} from './quota';

// Notification Service
export {
  NotificationService,
  getNotificationService,
  resetNotificationService,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notification';
export type {
  NotificationServiceConfig,
  NotificationType,
  NotificationChannel,
  NotificationPayload,
  BrowserNotificationPayload,
  NotificationPreferences,
} from './notification';

// User Settings Service
export { UserSettingsService, createUserSettingsService, DEFAULT_GENERATION_SETTINGS } from './user-settings';
export type {
  UserSettingsServiceDependencies,
  DefaultGenerationSettings,
  UserSettingsData,
} from './user-settings';

// Rate Limiting
export { withRateLimit, checkRateLimit, resetRateLimiters, RateLimitError } from './rate-limit';
export type { RateLimitResult } from './rate-limit';

// API Key Management
export {
  APIKeyPool,
  getAPIKeyPool,
  resetAPIKeyPool,
  getNextAPIKey,
  reportAPIKeySuccess,
  reportAPIKeyError,
} from './api-keys';
