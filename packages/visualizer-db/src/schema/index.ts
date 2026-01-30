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
export { product, productImage, productRelations, productImageRelations } from './products';
export type { ProductSource, ProductAnalysis } from './products';

// Category tables (open, multi-category system)
export { category, productCategory, categoryRelations, productCategoryRelations } from './categories';

// Session tables
export {
  chatSession,
  collectionSession,
  message,
  generationFlow,
  generationFlowProduct,
  chatSessionRelations,
  collectionSessionRelations,
  messageRelations,
  generationFlowRelations,
  generationFlowProductRelations,
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

// Analytics tables
export { generationEvent, generationEventRelations } from './analytics';
export type { GenerationEventType } from './analytics';

// Store sync tables
export { storeConnection, storeSyncLog, storeConnectionRelations, storeSyncLogRelations } from './store-sync';
export type { StoreType, StoreConnectionStatus, SyncAction, SyncStatus, WebhookEvent } from './store-sync';

// User settings tables
export { userSettings, userSettingsRelations, DEFAULT_NOTIFICATION_SETTINGS, DEFAULT_GENERATION_DEFAULTS } from './user-settings';
export type { NotificationSettings, DefaultGenerationSettings } from './user-settings';

// Usage/Quota tables
export { usageRecord, quotaLimit, aiCostTracking, creditAuditLog, usageRecordRelations, quotaLimitRelations, aiCostTrackingRelations, creditAuditLogRelations } from './usage';
export type { PlanType, AIOperationType, AuditAction } from './usage';

// Billing tables
export {
  subscriptionPlans,
  subscriptions,
  billingTransactions,
  creditPacks,
  subscriptionsRelations,
  billingTransactionsRelations,
} from './billing';
export type { SubscriptionStatus, BillingCycle, TransactionType, TransactionStatus } from './billing';

// Generation Jobs (PostgreSQL queue)
export { generationJob, generationJobRelations } from './jobs';
export type {
  JobType,
  JobStatus,
  PromptTags,
  ImageGenerationPayload,
  ImageEditPayload,
  VideoGenerationPayload,
  SyncProductPayload,
  SyncAllProductsPayload,
  JobResult,
} from './jobs';

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

// Re-export all generated DB types for type-safe database operations
export type * from './generated/db-types.generated';
