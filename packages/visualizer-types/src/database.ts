/**
 * Database Types
 * Create and Update types for database operations
 */

import type { FlowGenerationSettings, ClientMetadata, FlowStatus } from './settings';
import type { MessagePart, MessageRole } from './messages';

// ===== CLIENT (formerly Organization) =====

export interface ClientCreate {
  name: string;
  slug?: string;
  logo?: string;
  metadata?: ClientMetadata;
}

export interface ClientUpdate {
  name?: string;
  slug?: string;
  logo?: string;
  metadata?: ClientMetadata;
}

// Legacy aliases for backward compatibility
export type OrganizationCreate = ClientCreate;
export type OrganizationUpdate = ClientUpdate;

// ===== PRODUCT =====

export interface ProductCreate {
  name: string;
  description?: string;
  category?: string;
  roomTypes?: string[];
  modelFilename?: string;
  favoriteGeneratedImages?: Array<{ imageId: string; sessionId: string }>;
  sceneImages?: Array<{ imageId: string; sessionId: string }>;
}

export interface ProductUpdate {
  name?: string;
  description?: string | null;
  category?: string | null;
  roomTypes?: string[] | null;
  modelFilename?: string | null;
  favoriteGeneratedImages?: Array<{ imageId: string; sessionId: string }>;
  sceneImages?: Array<{ imageId: string; sessionId: string }>;
}

// ===== PRODUCT IMAGE =====

export interface ProductImageCreate {
  r2KeyBase: string;
  r2KeyPreview?: string;
  sortOrder?: number;
}

export interface ProductImageUpdate {
  r2KeyPreview?: string;
  sortOrder?: number;
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

// ===== STUDIO SESSION (formerly ClientSession) =====

export interface StudioSessionCreate {
  name: string;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
}

export interface StudioSessionUpdate {
  name?: string;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
}

// Legacy aliases for backward compatibility
export type ClientSessionCreate = StudioSessionCreate;
export type ClientSessionUpdate = StudioSessionUpdate;

// ===== MESSAGE =====

export interface MessageCreate {
  role: MessageRole;
  parts: MessagePart[];
  baseImageId?: string;
  baseImageIds?: Record<string, string>;
  inspirationImageId?: string;
}

export interface MessageUpdate {
  parts?: MessagePart[];
}

// ===== FLOW =====

export interface FlowCreate {
  name?: string;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
  settings?: Partial<FlowGenerationSettings>;
}

export interface FlowUpdate {
  name?: string;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
  status?: FlowStatus;
  settings?: Partial<FlowGenerationSettings>;
  currentImageIndex?: number;
}

// ===== GENERATED IMAGE =====

export interface GeneratedImageCreate {
  clientId: string;
  flowId?: string;
  chatSessionId?: string | null;
  r2Key: string;
  prompt?: string | null;
  settings?: FlowGenerationSettings;
  productIds?: string[];
  jobId?: string | null;
  error?: string | null;
}

// ===== FAVORITE IMAGE =====

export interface FavoriteImageCreate {
  clientId: string;
  generatedImageId: string;
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

export type SessionType = 'chat' | 'studio';
