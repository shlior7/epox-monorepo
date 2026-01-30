/**
 * Database Types
 * Create and Update types for database operations
 */

import type { FlowGenerationSettings, CollectionGenerationSettings, ClientMetadata, FlowStatus } from './settings';
import type { MessagePart, MessageRole } from './messages';
import type { ClientGenerationDefaults } from './categories';
import type {
  ProductSource,
  ProductAnalysis,
  CollectionSessionStatus,
  AssetType,
  AssetStatus,
  ApprovalStatus,
  AssetAnalysis,
  StoreType,
  StoreConnectionStatus,
  SyncAction,
  SyncStatus,
  GenerationEventType,
} from './domain';

// ===== CLIENT =====

export interface ClientCreate {
  name: string;
  slug?: string;
  logo?: string;
  metadata?: ClientMetadata;
  generationDefaults?: ClientGenerationDefaults;
}

export interface ClientUpdate {
  name?: string;
  slug?: string;
  logo?: string;
  metadata?: ClientMetadata;
  generationDefaults?: ClientGenerationDefaults;
}

// ===== PRODUCT =====

export interface ProductCreate {
  name: string;
  description?: string;
  category?: string;
  sceneTypes?: string[]; // Renamed from sceneTypes
  modelFilename?: string;
  isFavorite?: boolean;
  source?: ProductSource;
  storeConnectionId?: string;
  storeId?: string;
  storeSku?: string;
  storeUrl?: string;
  storeName?: string;
  importedAt?: Date;
  analysisData?: ProductAnalysis;
  analysisVersion?: string;
  analyzedAt?: Date;
  defaultGenerationSettings?: FlowGenerationSettings;
  price?: string;
  metadata?: Record<string, unknown>;
}

export interface ProductUpdate {
  name?: string;
  description?: string | null;
  category?: string | null;
  sceneTypes?: string[] | null; // Renamed from sceneTypes
  modelFilename?: string | null;
  isFavorite?: boolean;
  source?: ProductSource;
  storeConnectionId?: string | null;
  storeId?: string | null;
  storeSku?: string | null;
  storeUrl?: string | null;
  storeName?: string | null;
  importedAt?: Date | null;
  analysisData?: ProductAnalysis | null;
  analysisVersion?: string | null;
  analyzedAt?: Date | null;
  defaultGenerationSettings?: FlowGenerationSettings | null;
  price?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ===== PRODUCT IMAGE =====

export interface ProductImageCreate {
  imageUrl: string;
  previewUrl?: string;
  sortOrder?: number;
  isPrimary?: boolean;
  syncStatus?: 'synced' | 'unsynced' | 'local';
  originalStoreUrl?: string | null;
  externalImageId?: string | null;
}

export interface ProductImageUpdate {
  previewUrl?: string;
  sortOrder?: number;
  isPrimary?: boolean;
  syncStatus?: 'synced' | 'unsynced' | 'local';
  originalStoreUrl?: string | null;
  externalImageId?: string | null;
}

// ===== CHAT SESSION =====

export interface ChatSessionCreate {
  name: string;
  selectedBaseImageId?: string | null;
}

export interface ChatSessionUpdate {
  name?: string;
  selectedBaseImageId?: string;
}

// ===== COLLECTION SESSION =====

export interface CollectionSessionCreate {
  name: string;
  status?: CollectionSessionStatus;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
  // Support both types for backwards compatibility during migration
  settings?: CollectionGenerationSettings | FlowGenerationSettings;
}

export interface CollectionSessionUpdate {
  name?: string;
  status?: CollectionSessionStatus;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
  // Support both types for backwards compatibility during migration
  settings?: CollectionGenerationSettings | FlowGenerationSettings;
}

// ===== MESSAGE =====

export interface MessageCreate {
  role: MessageRole;
  parts: MessagePart[];
  baseImageIds?: Record<string, string>;
  inspirationImageId?: string;
}

export interface MessageUpdate {
  parts?: MessagePart[];
}

// ===== GENERATION FLOW =====

export interface GenerationFlowCreate {
  collectionSessionId?: string | null;
  name?: string;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
  settings?: Partial<FlowGenerationSettings>;
  isFavorite?: boolean;
}

export interface GenerationFlowUpdate {
  name?: string;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
  status?: FlowStatus;
  settings?: Partial<FlowGenerationSettings>;
  isFavorite?: boolean;
  currentImageIndex?: number;
}

// ===== GENERATED ASSET =====

export interface GeneratedAssetCreate {
  clientId: string;
  generationFlowId?: string | null;
  chatSessionId?: string | null;
  assetUrl: string;
  originalAssetUrl?: string | null;
  assetType?: AssetType;
  status?: AssetStatus;
  prompt?: string | null;
  settings?: FlowGenerationSettings;
  productIds?: string[];
  jobId?: string | null;
  error?: string | null;
  assetAnalysis?: AssetAnalysis | null;
  analysisVersion?: string | null;
  approvalStatus?: ApprovalStatus;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  completedAt?: Date | null;
  pinned?: boolean;
}

export interface GeneratedAssetUpdate {
  assetUrl?: string;
  originalAssetUrl?: string | null;
  assetType?: AssetType;
  status?: AssetStatus;
  prompt?: string | null;
  settings?: FlowGenerationSettings | null;
  productIds?: string[] | null;
  jobId?: string | null;
  error?: string | null;
  assetAnalysis?: AssetAnalysis | null;
  analysisVersion?: string | null;
  approvalStatus?: ApprovalStatus;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  completedAt?: Date | null;
  pinned?: boolean;
  // Store sync tracking
  externalImageId?: string | null;
  syncedAt?: Date | null;
  deletedAt?: Date | null;
}

// ===== GENERATED ASSET PRODUCT =====

export interface GeneratedAssetProductCreate {
  generatedAssetId: string;
  productId: string;
  isPrimary?: boolean;
}

// ===== FAVORITE IMAGE =====

export interface FavoriteImageCreate {
  clientId: string;
  generatedAssetId: string;
}

// ===== STORE CONNECTION =====

export interface StoreConnectionCreate {
  clientId: string;
  storeType: StoreType;
  storeName: string;
  storeUrl: string;
  status?: StoreConnectionStatus;
  credentials: Record<string, unknown>;
  syncConfig?: Record<string, unknown>;
}

export interface StoreConnectionUpdate {
  storeName?: string;
  storeUrl?: string;
  status?: StoreConnectionStatus;
  credentials?: Record<string, unknown>;
  syncConfig?: Record<string, unknown> | null;
  lastSyncAt?: Date | null;
}

// ===== STORE SYNC LOG =====

export interface StoreSyncLogCreate {
  storeConnectionId: string;
  action: SyncAction;
  status?: SyncStatus;
  itemsProcessed?: number;
  itemsFailed?: number;
  errorDetails?: string | null;
  startedAt: Date;
  completedAt?: Date | null;
}

export interface StoreSyncLogUpdate {
  status?: SyncStatus;
  itemsProcessed?: number;
  itemsFailed?: number;
  errorDetails?: string | null;
  completedAt?: Date | null;
}

// ===== GENERATION EVENT =====

export interface GenerationEventCreate {
  clientId: string;
  userId?: string | null;
  eventType: GenerationEventType;
  generationFlowId?: string | null;
  generatedAssetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ===== MEMBER =====

export interface MemberCreate {
  clientId: string;
  userId: string;
  role?: string;
}

export interface MemberUpdate {
  role?: string;
}

// ===== SESSION TYPE =====

export type SessionType = 'chat' | 'collection';
