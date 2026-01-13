/**
 * Database Schema Index
 * Re-exports all schema tables and relations
 */

// Auth tables (Better Auth compatible)
export {
  adminUser,
  adminSession,
  user,
  session,
  account,
  verification,
  client,
  member,
  invitation,
  adminUserRelations,
  adminSessionRelations,
  userRelations,
  sessionRelations,
  accountRelations,
  clientRelations,
  memberRelations,
  invitationRelations,
} from './auth';

// Product tables
export {
  product,
  productImage,
  productRelations,
  productImageRelations,
} from './products';
export type { ProductSource, ProductAnalysis } from './products';

// Session tables
export {
  chatSession,
  collectionSession,
  message,
  generationFlow,
  chatSessionRelations,
  collectionSessionRelations,
  messageRelations,
  generationFlowRelations,
} from './sessions';

// Generated assets
export {
  generatedAsset,
  generatedAssetProduct,
  favoriteImage,
  generatedAssetRelations,
  generatedAssetProductRelations,
  favoriteImageRelations,
} from './generated-images';
export type { AssetType, AssetStatus, ApprovalStatus, AssetAnalysis } from './generated-images';

// Organization tables (tags, favorites)
export {
  tag,
  tagAssignment,
  userFavorite,
  tagRelations,
  tagAssignmentRelations,
  userFavoriteRelations,
} from './clients';
export type { TaggableEntityType, FavoriteEntityType } from './clients';

// Analytics tables
export {
  generationEvent,
  generationEventRelations,
} from './analytics';
export type { GenerationEventType } from './analytics';

// Store sync tables
export {
  storeConnection,
  storeSyncLog,
  storeConnectionRelations,
  storeSyncLogRelations,
} from './store-sync';
export type { StoreType, StoreConnectionStatus, SyncAction, SyncStatus } from './store-sync';

// Re-export types from visualizer-types for convenience
export type {
  ClientMetadata,
  CommerceConfig,
  AIModelConfig,
  FlowStatus,
  FlowGenerationSettings,
  PostAdjustments,
  MessagePart,
  TextMessagePart,
  ImageMessagePart,
  PromptSettingsMessagePart,
} from 'visualizer-types';
