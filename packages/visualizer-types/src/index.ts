/**
 * Visualizer Types
 * Consolidated types for the visualizer application
 */

// Settings types
export type {
  LightAdjustments,
  ColorAdjustments,
  EffectsAdjustments,
  PostAdjustments,
  FlowGenerationSettings,
  PromptSettings,
  AIModelConfig,
  CommerceProvider,
  CommerceConfig,
  ClientMetadata,
  FlowStatus,
  ImageQuality,
} from './settings';

export {
  DEFAULT_POST_ADJUSTMENTS,
  DEFAULT_FLOW_SETTINGS,
  DEFAULT_PROMPT_SETTINGS,
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
  ChatSession,
  CollectionSession,
  CollectionSessionStatus,
  Message,
  GenerationFlow,
  GeneratedAsset,
  AssetType,
  AssetStatus,
  ApprovalStatus,
  AssetAnalysis,
  GeneratedAssetProduct,
  FavoriteImage,
  Tag,
  TagAssignment,
  TaggableEntityType,
  UserFavorite,
  FavoriteEntityType,
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
  FlowGeneratedImage,
} from './domain';

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
  TagCreate,
  TagUpdate,
  TagAssignmentCreate,
  UserFavoriteCreate,
  StoreConnectionCreate,
  StoreConnectionUpdate,
  StoreSyncLogCreate,
  StoreSyncLogUpdate,
  GenerationEventCreate,
  MemberCreate,
  MemberUpdate,
  SessionType,
} from './database';
