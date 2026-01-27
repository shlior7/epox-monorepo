/**
 * Visualizer Types
 * Consolidated types for the visualizer application
 */

// Bubble types (extensible system)
export type {
  BaseBubbleValue,
  BubbleValue,
  BubbleType,
  StyleBubbleValue,
  LightingBubbleValue,
  CameraAngleBubbleValue,
  ReferenceBubbleValue,
  ColorPaletteBubbleValue,
  MoodBubbleValue,
  CustomBubbleValue,
} from './bubbles';

export { isBubbleType } from './bubbles';

// Bubble utility functions
export {
  getBubblesForSceneType,
  hasNewBubbleFormat,
  isBubbleEmpty,
  filterEmptyBubbles,
  extractBubbleFromInspiration,
} from './bubble-utils';

// Settings types
export type {
  LightAdjustments,
  ColorAdjustments,
  EffectsAdjustments,
  PostAdjustments,
  CollectionGenerationSettings,
  FlowGenerationSettings,
  VideoPromptSettings,
  VideoGenerationSettings,
  VideoResolution,
  VideoAspectRatio,
  ImageAspectRatio,
  PromptSettings,
  PromptTags,
  AIModelConfig,
  CommerceProvider,
  CommerceConfig,
  ClientMetadata,
  FlowStatus,
  ImageQuality,
  // New types for studio settings redesign
  NativeSceneCategory,
  InputCameraAngle,
  SubjectAnalysis,
  VisionAnalysisJson,
  VisionAnalysisResult,
  InspirationSourceType,
  InspirationImage,
  SceneTypeInspirationEntry,
  SceneTypeInspirationMap,
} from './settings';

export {
  DEFAULT_POST_ADJUSTMENTS,
  DEFAULT_FLOW_SETTINGS,
  DEFAULT_PROMPT_SETTINGS,
  DEFAULT_PROMPT_TAGS,
  PROMPT_TAG_OPTIONS,
  VIDEO_TYPE_OPTIONS,
  CAMERA_MOTION_OPTIONS,
  VIDEO_ASPECT_RATIO_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
  IMAGE_ASPECT_RATIO_OPTIONS,
  // Utility functions
  normalizeImageQuality,
  formatAspectRatioDisplay,
  // Inspiration defaults
  DEFAULT_SCENE_TYPE_INSPIRATION_ENTRY,
} from './settings';

// Message types
export type {
  MessagePartType,
  TextMessagePart,
  ImageMessagePart,
  PromptSettingsMessagePart,
  MessagePart,
  MessageRole,
  GenerationStatus,
} from './messages';

// Domain entity types
export type {
  BaseEntity,
  VersionedEntity,
  User,
  Client,
  Member,
  Product,
  ProductSource,
  ProductAnalysis,
  ProductImage,
  ImageSyncStatus,
  ChatSession,
  CollectionSession,
  CollectionSessionStatus,
  Message,
  GenerationFlow,
  GenerationFlowProduct,
  GeneratedAsset,
  AssetType,
  AssetStatus,
  ApprovalStatus,
  AssetAnalysis,
  GeneratedAssetProduct,
  FavoriteImage,
  StoreConnection,
  StoreType,
  StoreConnectionStatus,
  StoreSyncLog,
  SyncAction,
  SyncStatus,
  GenerationEvent,
  GenerationEventType,
  ProductWithImages,
  ProductWithDetails,
  ChatSessionWithMessages,
  CollectionSessionWithFlows,
  GenerationFlowWithAssets,
  GenerationFlowWithDetails,
  FlowGeneratedImage,
  AssetSyncStatus,
  GeneratedAssetWithSync,
  ProductAssetGroup,
  StoreProductView,
} from './domain';

// Queue types (for scenergy-queue)
export type {
  AIJobType,
  JobStatus,
  JobPriority,
  BaseJobPayload,
  ImageGenerationPayload,
  ImageGenerationSettings,
  ImageEditPayload,
  VideoGenerationPayload,
  UpscalePayload,
  BackgroundRemovalPayload,
  JobPayloadMap,
  JobPayload,
  BaseJobResult,
  ImageGenerationResult,
  ImageEditResult,
  VideoGenerationResult,
  UpscaleResult,
  BackgroundRemovalResult,
  JobResultMap,
  JobResult,
  JobInfo,
  EnqueueOptions,
  QueueStats,
  QueueClientConfig,
  WorkerConfig,
} from './queue';

export { JOB_PRIORITIES } from './queue';

// Database operation types
export type {
  ClientCreate,
  ClientUpdate,
  ProductCreate,
  ProductUpdate,
  ProductImageCreate,
  ProductImageUpdate,
  ChatSessionCreate,
  ChatSessionUpdate,
  CollectionSessionCreate,
  CollectionSessionUpdate,
  MessageCreate,
  MessageUpdate,
  GenerationFlowCreate,
  GenerationFlowUpdate,
  GeneratedAssetCreate,
  GeneratedAssetUpdate,
  GeneratedAssetProductCreate,
  FavoriteImageCreate,
  StoreConnectionCreate,
  StoreConnectionUpdate,
  StoreSyncLogCreate,
  StoreSyncLogUpdate,
  GenerationEventCreate,
  MemberCreate,
  MemberUpdate,
  SessionType,
} from './database';
