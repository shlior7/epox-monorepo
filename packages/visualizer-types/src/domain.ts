/**
 * Domain Entity Types
 * Core business domain types for the visualizer application
 */

import type { FlowGenerationSettings, FlowStatus, ClientMetadata } from './settings';
import type { MessagePart, MessageRole } from './messages';

// ===== BASE TYPES =====

/**
 * Base entity with common fields for all database entities
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entity with optimistic locking support
 */
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

// ===== CLIENT (formerly Organization) =====

export interface Client extends VersionedEntity {
  name: string;
  slug: string | null;
  logo: string | null;
  metadata: ClientMetadata | null;
}

// Legacy alias for backward compatibility
export type Organization = Client;

// ===== MEMBER =====

export interface Member extends BaseEntity {
  clientId: string;
  userId: string;
  role: string;
}

// ===== PRODUCT =====

export interface Product extends VersionedEntity {
  clientId: string;
  name: string;
  description: string | null;
  category: string | null;
  roomTypes: string[] | null;
  modelFilename: string | null;
  favoriteGeneratedImages?: Array<{ imageId: string; sessionId: string }>;
  sceneImages?: Array<{ imageId: string; sessionId: string }>;
}

// ===== PRODUCT IMAGE =====

export interface ProductImage extends VersionedEntity {
  productId: string;
  r2KeyBase: string;
  r2KeyPreview: string | null;
  sortOrder: number;
}

// ===== CHAT SESSION (Single Product) =====

export interface ChatSession extends VersionedEntity {
  productId: string;
  name: string;
  selectedBaseImageId: string | null;
}

// ===== STUDIO SESSION (Multi-Product, formerly ClientSession) =====

export interface StudioSession extends VersionedEntity {
  clientId: string;
  name: string;
  productIds: string[];
  selectedBaseImages: Record<string, string>;
}

// Legacy alias for backward compatibility
export type ClientSession = StudioSession;

// ===== MESSAGE =====

export interface Message extends VersionedEntity {
  chatSessionId: string | null;
  studioSessionId: string | null;
  role: MessageRole;
  parts: MessagePart[];
  baseImageId: string | null;
  baseImageIds: Record<string, string> | null;
  inspirationImageId: string | null;
}

// ===== FLOW =====

export interface Flow extends VersionedEntity {
  studioSessionId: string;
  name: string | null;
  productIds: string[];
  selectedBaseImages: Record<string, string>;
  status: FlowStatus;
  settings: FlowGenerationSettings;
  currentImageIndex: number;
}

// ===== GENERATED IMAGE =====

export interface GeneratedImage extends BaseEntity {
  clientId: string;
  flowId: string | null;
  chatSessionId: string | null;
  r2Key: string;
  prompt: string | null;
  settings: FlowGenerationSettings | null;
  productIds: string[] | null;
  jobId: string | null;
  error: string | null;
}

// ===== FAVORITE IMAGE =====

export interface FavoriteImage extends BaseEntity {
  clientId: string;
  generatedImageId: string;
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

export interface StudioSessionWithFlows extends StudioSession {
  flows: Flow[];
  messages: Message[];
}

// Legacy alias for backward compatibility
export type ClientSessionWithFlows = StudioSessionWithFlows;

export interface FlowWithGeneratedImages extends Flow {
  generatedImages: GeneratedImage[];
}

// ===== FLOW GENERATED IMAGE (for client-side history) =====

export interface FlowGeneratedImage {
  id: string;
  imageId: string;
  timestamp: string;
  productIds: string[];
  settings: FlowGenerationSettings;
  prompt?: string;
  jobId?: string;
  error?: string;
}
