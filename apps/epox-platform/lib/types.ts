/**
 * Re-export shared types from visualizer-types
 * Only add UI-specific types here that don't belong in the shared package
 */

// Re-export all domain types
export type {
  User,
  Client,
  Member,
  Product,
  ProductSource,
  ProductAnalysis,
  ProductImage,
  ProductWithImages,
  ProductWithDetails,
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
  StoreConnection,
  StoreType,
  StoreConnectionStatus,
  StoreSyncLog,
  SyncAction,
  SyncStatus,
  GenerationEvent,
  GenerationEventType,
  CollectionSessionWithFlows,
  GenerationFlowWithAssets,
  FlowGeneratedImage,
} from 'visualizer-types';

// Re-export settings types
export type {
  FlowGenerationSettings,
  FlowStatus,
  PromptSettings,
  PostAdjustments,
  LightAdjustments,
  ColorAdjustments,
  EffectsAdjustments,
  ImageQuality,
  AIModelConfig,
  CommerceProvider,
  CommerceConfig,
  ClientMetadata,
} from 'visualizer-types';

export {
  DEFAULT_FLOW_SETTINGS,
  DEFAULT_PROMPT_SETTINGS,
  DEFAULT_POST_ADJUSTMENTS,
} from 'visualizer-types';

// ===== UI-SPECIFIC TYPES (Client Platform only) =====

/**
 * Prompt Tags for the wizard Q&A form
 * Gets converted to FlowGenerationSettings.promptText
 */
export interface PromptTags {
  sceneType: string[];
  mood: string[];
  lighting: string[];
  style: string[];
  custom: string[];
}

/**
 * Build prompt text from PromptTags
 */
export function buildPromptFromTags(tags: PromptTags): string {
  return [
    ...tags.sceneType,
    ...tags.mood,
    ...tags.lighting.map((l) => `${l} lighting`),
    ...tags.style.map((s) => `${s} style`),
    ...tags.custom,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Dashboard statistics (UI aggregate)
 */
export interface DashboardStats {
  totalProducts: number;
  totalCollections: number;
  totalGenerated: number;
  creditsUsed: number;
  creditsTotal: number;
  creditsResetAt: Date;
}

/**
 * Recent collection for dashboard display
 */
export interface RecentCollection {
  id: string;
  name: string;
  status: 'draft' | 'generating' | 'completed';
  productCount: number;
  generatedCount: number;
  updatedAt: Date;
  thumbnailUrl?: string;
}

/**
 * Pagination types
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter types for list views
 */
export interface ProductFilters {
  categories?: string[];
  sceneTypes?: string[];
  source?: 'imported' | 'uploaded';
  favoritesOnly?: boolean;
}

export interface CollectionFilters {
  status?: 'draft' | 'generating' | 'completed';
}
