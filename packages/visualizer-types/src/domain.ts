/**
 * Domain Entity Types
 * Core business domain types for the visualizer application
 */

import type { FlowGenerationSettings, CollectionGenerationSettings, FlowStatus, ClientMetadata, SubjectAnalysis } from './settings';
import type { MessagePart, MessageRole } from './messages';

// ===== BASE TYPES =====

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VersionedEntity extends BaseEntity {
  version: number;
}

// ===== USER =====

export interface User extends BaseEntity {
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
}

// ===== CLIENT =====

export interface Client extends VersionedEntity {
  name: string;
  slug: string | null;
  logo: string | null;
  metadata: ClientMetadata | null;
}

// ===== MEMBER =====

export interface Member extends BaseEntity {
  clientId: string;
  userId: string;
  role: string;
}

// ===== PRODUCT =====

export type ProductSource = 'imported' | 'uploaded';

export interface ProductAnalysis {
  analyzedAt: string;
  productType: string;
  materials: string[];
  colors: { primary: string; accent?: string[] };
  style: string[];
  sceneTypes: string[]; // Renamed from suggestedsceneTypes
  scaleHints: { width: string; height: string };
  promptKeywords: string[];
  version: string;
  // Subject Scanner output (pre-computed on product creation)
  subject?: SubjectAnalysis;
}

export interface Product extends VersionedEntity {
  clientId: string;
  name: string;
  description: string | null;
  category: string | null;
  sceneTypes: string[] | null;
  selectedSceneType: string | null;
  modelFilename: string | null;
  isFavorite: boolean;
  source: ProductSource;
  storeConnectionId: string | null;
  storeId: string | null;
  storeSku: string | null;
  storeUrl: string | null;
  storeName: string | null;
  importedAt: Date | null;
  analysisData: ProductAnalysis | null;
  analysisVersion: string | null;
  analyzedAt: Date | null;
  price: string | null;
  metadata: Record<string, unknown> | null;
}

// ===== PRODUCT IMAGE =====

export type ImageSyncStatus = 'synced' | 'unsynced' | 'local';

// NOTE: This interface should match the DB schema (product_image table)
// If you change the DB schema, update this interface accordingly
export interface ProductImage extends VersionedEntity {
  productId: string;
  imageUrl: string;
  previewUrl: string | null;
  sortOrder: number;
  isPrimary: boolean;
  // Sync status for bidirectional store sync
  syncStatus: ImageSyncStatus;
  originalStoreUrl: string | null;
  externalImageId: string | null;
}

// ===== CHAT SESSION (Single Product) =====

export interface ChatSession extends VersionedEntity {
  productId: string;
  name: string;
  selectedBaseImageId: string | null;
}

// ===== COLLECTION SESSION (Multi-Product) =====

export type CollectionSessionStatus = 'draft' | 'generating' | 'completed';

export interface CollectionSession extends VersionedEntity {
  clientId: string;
  name: string;
  status: CollectionSessionStatus;
  productIds: string[];
  selectedBaseImages: Record<string, string>;
  settings: CollectionGenerationSettings | FlowGenerationSettings | null; // Support both for migration
}

// ===== MESSAGE =====

export interface Message extends VersionedEntity {
  chatSessionId: string | null;
  collectionSessionId: string | null;
  role: MessageRole;
  parts: MessagePart[];
  baseImageIds: Record<string, string> | null;
  inspirationImageId: string | null;
}

// ===== GENERATION FLOW =====

export interface GenerationFlow extends VersionedEntity {
  collectionSessionId: string | null;
  clientId: string;
  name: string | null;
  productIds: string[];
  selectedBaseImages: Record<string, string>;
  status: FlowStatus;
  settings: FlowGenerationSettings;
  isFavorite: boolean;
  currentImageIndex: number;
}

// ===== GENERATED ASSET =====

export type AssetType = 'image' | 'video' | '3d_model';
export type AssetStatus = 'pending' | 'generating' | 'completed' | 'error';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AssetAnalysis {
  analyzedAt: string;
  colors?: { dominant: string[]; palette: string[] };
  alt?: string;
  name?: string;
  description?: string;
  version: string;
}

export interface GeneratedAsset extends BaseEntity {
  clientId: string;
  generationFlowId: string | null;
  chatSessionId: string | null;
  assetUrl: string;
  assetType: AssetType;
  status: AssetStatus;
  prompt: string | null;
  settings: FlowGenerationSettings | null;
  productIds: string[] | null;
  jobId: string | null;
  error: string | null;
  assetAnalysis: AssetAnalysis | null;
  analysisVersion: string | null;
  approvalStatus: ApprovalStatus;
  approvedAt: Date | null;
  approvedBy: string | null;
  completedAt: Date | null;
  pinned: boolean;
  deletedAt: Date | null;
  externalImageId: string | null; // Store's image ID when synced
}

// ===== GENERATED ASSET PRODUCT (Junction table) =====

export interface GeneratedAssetProduct extends BaseEntity {
  generatedAssetId: string;
  productId: string;
  isPrimary: boolean;
}

// ===== GENERATION FLOW PRODUCT (Junction table for many-to-many) =====

export interface GenerationFlowProduct {
  id: string;
  generationFlowId: string;
  productId: string;
  createdAt: Date;
}

// ===== FAVORITE IMAGE =====

export interface FavoriteImage extends BaseEntity {
  clientId: string;
  generatedAssetId: string;
}

// ===== STORE SYNC =====

export type StoreType = 'shopify' | 'woocommerce' | 'magento' | 'custom';
export type StoreConnectionStatus = 'active' | 'inactive' | 'error';
export type SyncAction = 'import' | 'export' | 'sync';
export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface StoreConnection extends BaseEntity {
  clientId: string;
  storeType: StoreType;
  storeName: string;
  storeUrl: string;
  status: StoreConnectionStatus;
  credentials: Record<string, unknown>;
  syncConfig: Record<string, unknown> | null;
  lastSyncAt: Date | null;
}

export interface StoreSyncLog extends BaseEntity {
  storeConnectionId: string;
  action: SyncAction;
  status: SyncStatus;
  itemsProcessed: number;
  itemsFailed: number;
  errorDetails: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

// ===== ANALYTICS =====

export type GenerationEventType =
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'asset_approved'
  | 'asset_rejected'
  | 'asset_exported';

export interface GenerationEvent extends BaseEntity {
  clientId: string;
  userId: string | null;
  eventType: GenerationEventType;
  generationFlowId: string | null;
  generatedAssetId: string | null;
  metadata: Record<string, unknown> | null;
}

// ===== COMBINED/AGGREGATE TYPES =====

export interface ProductWithImages extends Product {
  images: ProductImage[];
}

export interface ProductWithDetails extends Product {
  images: ProductImage[];
  chatSessions: ChatSession[];
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: Message[];
}

export interface CollectionSessionWithFlows extends CollectionSession {
  generationFlows: GenerationFlow[];
  messages: Message[];
}

export interface GenerationFlowWithAssets extends GenerationFlow {
  generatedAssets: GeneratedAsset[];
}

/** Enriched flow with product details, images, and generated assets for collection studio */
export interface GenerationFlowWithDetails extends GenerationFlow {
  product: {
    id: string;
    name: string;
    category: string | null;
    sceneTypes: string[] | null;
  } | null;
  baseImages: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
  generatedAssets: Array<{
    id: string;
    assetUrl: string;
    status: AssetStatus;
    approvalStatus: ApprovalStatus;
    aspectRatio: string | null;
    createdAt: Date;
    jobId: string | null;
  }>;
}

// ===== FLOW GENERATED IMAGE (for client-side history) =====

export interface FlowGeneratedImage {
  id: string;
  imageId: string;
  imageFilename?: string;
  timestamp: string;
  productIds: string[];
  settings: FlowGenerationSettings;
  prompt?: string;
  jobId?: string;
  error?: string;
}

// ===== STORE SYNC TYPES =====

export type AssetSyncStatus = 'synced' | 'not_synced' | 'failed' | 'pending';

export interface GeneratedAssetWithSync extends GeneratedAsset {
  syncStatus: AssetSyncStatus;
  lastSyncedAt?: Date;
  externalImageUrl?: string;
  syncError?: string;
  isFavorite?: boolean;

  product?: {
    id: string;
    name: string;
    storeId?: string;
    storeUrl?: string;
    storeName?: string;
  };
}

export interface ProductAssetGroup {
  product: Product;
  assets: GeneratedAssetWithSync[];
  syncedCount: number;
  favoriteCount: number;
  totalCount: number;
}

/**
 * Store page product view - shows products with their base images and generated assets
 * separated into synced (top section) and unsynced (bottom section)
 */
export interface StoreProductView {
  product: Product;
  /** Base images from the store (for imported products, these are the original store images) */
  baseImages: ProductImage[];
  /** Whether this product is linked to a store product (has storeId) */
  isMappedToStore: boolean;
  /** Generated assets that have been synced to the store */
  syncedAssets: GeneratedAssetWithSync[];
  /** Generated assets not yet synced (or failed/pending) */
  unsyncedAssets: GeneratedAssetWithSync[];
  /** Counts for display */
  syncedCount: number;
  unsyncedCount: number;
  totalAssetCount: number;
}
