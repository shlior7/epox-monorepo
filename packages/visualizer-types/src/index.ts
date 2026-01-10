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
  OrganizationMetadata, // Legacy alias
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
  Organization, // Legacy alias
  Member,
  Product,
  ProductImage,
  ChatSession,
  StudioSession,
  ClientSession, // Legacy alias
  Message,
  Flow,
  GeneratedImage,
  FavoriteImage,
  ProductWithImages,
  ProductWithDetails,
  ChatSessionWithMessages,
  StudioSessionWithFlows,
  ClientSessionWithFlows, // Legacy alias
  FlowWithGeneratedImages,
  FlowGeneratedImage,
} from './domain';

// Database operation types
export type {
  ClientCreate,
  ClientUpdate,
  OrganizationCreate, // Legacy alias
  OrganizationUpdate, // Legacy alias
  ProductCreate,
  ProductUpdate,
  ProductImageCreate,
  ProductImageUpdate,
  ChatSessionCreate,
  ChatSessionUpdate,
  StudioSessionCreate,
  StudioSessionUpdate,
  ClientSessionCreate, // Legacy alias
  ClientSessionUpdate, // Legacy alias
  MessageCreate,
  MessageUpdate,
  FlowCreate,
  FlowUpdate,
  GeneratedImageCreate,
  FavoriteImageCreate,
  MemberCreate,
  MemberUpdate,
  SessionType,
} from './database';
