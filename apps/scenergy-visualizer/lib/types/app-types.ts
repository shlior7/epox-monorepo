/**
 * Core data types for the AI Product Visualizer application
 */

// ===== MESSAGE PARTS =====
export type MessagePartType = 'text' | 'image' | 'prompt-settings';

export interface TextMessagePart {
  type: 'text';
  content: string;
}

export interface ImageMessagePart {
  type: 'image';
  imageIds: string[]; // References to images in the media folder
  jobId?: string; // Job ID for tracking generation status
  status?: 'pending' | 'generating' | 'completed' | 'error'; // Generation status
  progress?: number; // 0-100
  error?: string; // Error message if failed
  metadata?: {
    prompt?: string;
    settings?: PromptSettings;
    productName?: string; // For client sessions: display name of the product
  };
  productId?: string; // For client sessions: which product this image belongs to
}

export interface PromptSettingsMessagePart {
  type: 'prompt-settings';
  settings: PromptSettings;
}

export type MessagePart = TextMessagePart | ImageMessagePart | PromptSettingsMessagePart;

// ===== MESSAGES =====
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  timestamp: string; // ISO 8601 format
  inspirationImageId?: string; // Optional reference to an inspiration image
  baseImageId?: string; // Base product image used for generation (single product)
  baseImageIds?: { [productId: string]: string }; // Base images used for generation (multi-product)
}

// ===== PROMPT SETTINGS =====
export interface PromptSettings {
  scene: string;
  style: string;
  lighting: string;
  surroundings: string;
  aspectRatio: string;
  numberOfVariants: number;
  // Optional custom values
  customScene?: string;
  customStyle?: string;
  customLighting?: string;
  customSurroundings?: string;
}

// ===== SESSION =====
export interface Session {
  id: string;
  name: string;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  messages: Message[];
  productId: string; // Parent reference
  selectedBaseImageId?: string; // Selected base image for this session
}

// ===== FLOW (Output Slot) =====
export interface Flow {
  id: string;
  name?: string; // Optional name for the flow
  productIds: string[]; // Products to include in this generation
  selectedBaseImages: { [productId: string]: string }; // Map of productId -> selected base imageId
  status: FlowStatus;
  settings: FlowGenerationSettings;
  generatedImages: FlowGeneratedImage[]; // All generated variations (history)
  currentImageIndex: number; // Index of currently displayed image in history
  createdAt: string;
  updatedAt: string;
}

export type FlowStatus = 'empty' | 'configured' | 'generating' | 'completed' | 'error';

// ===== POST ADJUSTMENTS =====
export interface LightAdjustments {
  exposure: number; // -100 to 100, default 0
  contrast: number; // -100 to 100, default 0
  highlights: number; // -100 to 100, default 0
  shadows: number; // -100 to 100, default 0
  whites: number; // -100 to 100, default 0
  blacks: number; // -100 to 100, default 0
}

export interface ColorAdjustments {
  temperature: number; // -100 to 100, default 0 (negative = cooler, positive = warmer)
  vibrance: number; // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
}

export interface EffectsAdjustments {
  texture: number; // -100 to 100, default 0
  clarity: number; // -100 to 100, default 0
  sharpness: number; // 0 to 100, default 0
}

export interface PostAdjustments {
  light: LightAdjustments;
  color: ColorAdjustments;
  effects: EffectsAdjustments;
}

export const DEFAULT_POST_ADJUSTMENTS: PostAdjustments = {
  light: {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
  },
  color: {
    temperature: 0,
    vibrance: 0,
    saturation: 0,
  },
  effects: {
    texture: 0,
    clarity: 0,
    sharpness: 0,
  },
};

export interface FlowGenerationSettings {
  scene?: string; // Scene/backdrop name or 'Custom'
  sceneImageUrl?: string; // URL of the backdrop image
  customScene?: string;
  sceneType: string;
  style: string;
  customStyle?: string;
  lighting: string;
  customLighting?: string;
  cameraAngle: string;
  aspectRatio: string;
  surroundings: string;
  customSurroundings?: string;
  colorScheme: string;
  props: string[];
  varietyLevel: number; // 1-10
  matchProductColors: boolean;
  includeAccessories: boolean;
  promptText: string; // Freeform custom instructions
  customPrompt?: string; // Full prompt override from Debug modal
  imageModel?: string; // AI model for image generation
  imageQuality?: '1k' | '2k' | '4k'; // Output image resolution
  postAdjustments?: PostAdjustments; // Post-processing adjustments for generated images
}

export interface FlowGeneratedImage {
  id: string;
  imageId: string; // Reference to image in S3 (without extension)
  imageFilename?: string; // Full filename with extension
  timestamp: string;
  productIds: string[];
  settings: FlowGenerationSettings;
  prompt?: string; // The actual prompt sent to generation
  jobId?: string;
  error?: string;
}

export const DEFAULT_FLOW_SETTINGS: FlowGenerationSettings = {
  scene: 'Studio Set',
  sceneType: 'Studio Set',
  style: 'Modern Minimalist',
  lighting: 'Studio Soft Light',
  cameraAngle: 'Front',
  aspectRatio: '1:1',
  surroundings: 'Minimal (No Props)',
  colorScheme: 'Neutral',
  props: [],
  varietyLevel: 5,
  matchProductColors: true,
  includeAccessories: false,
  promptText: '',
  customPrompt: '',
};

export function createDefaultFlow(id: string): Flow {
  const now = new Date().toISOString();
  return {
    id,
    productIds: [],
    selectedBaseImages: {},
    status: 'empty',
    settings: { ...DEFAULT_FLOW_SETTINGS },
    generatedImages: [],
    currentImageIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// ===== STUDIO SESSION (Multi-Product with Flows) =====
export interface StudioSession {
  id: string;
  name: string;
  clientId: string; // Parent reference
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format

  // Chat messages (for assistant interaction)
  messages: Message[];

  // Studio flows (generation rows)
  flows: Flow[];

  // Legacy/convenience fields for backward compatibility
  productIds: string[]; // All products included in this session (derived from flows)
  selectedBaseImages: { [productId: string]: string }; // Global defaults, can be overridden per flow
}

// Legacy alias for backward compatibility
export type ClientSession = StudioSession;

export interface SceneStudio {
  id: string;
  name: string;
  clientId: string; // Parent reference
  outputSlots: OutputSlotConfig[]; // All generation rows
  userScenes?: Scene[]; // Custom user-uploaded scenes
  createdAt: string;
  updatedAt: string;
}

// ===== PRODUCT =====
export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string; // User-defined category (lowercase)
  sceneTypes?: string[]; // Room types this product is associated with
  productImageIds: string[]; // References to product images in media folder
  modelFilename?: string; // Stored GLB filename in S3 (media/models/)
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  sessions: Session[];
  clientId: string; // Parent reference
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  category?: string;
  sceneTypes?: string[];
  modelFilename?: string;
  // NOTE: favoriteGeneratedImages and sceneImages removed - use pinned on generated_asset
}

export interface CreateSessionPayload {
  name?: string;
  selectedBaseImageId?: string;
}

export interface CreateStudioSessionPayload {
  name?: string;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
}

export interface CreateFlowPayload {
  name?: string;
  productIds?: string[];
  selectedBaseImages?: Record<string, string>;
  settings?: Partial<FlowGenerationSettings>;
}

// ===== AI MODEL CONFIGURATION =====
export interface AIModelConfig {
  imageModel: string;
  fallbackImageModel?: string;
  textModel?: string;
  fallbackTextModel?: string;
}

// ===== CLIENT =====
import type { CommerceProvider, CommerceConfig as BaseCommerceConfig } from 'visualizer-types';

export type { CommerceProvider };

export interface CommerceConfig extends BaseCommerceConfig {
  baseUrl: string;
}

export interface CreateClientPayload {
  clientId: string;
  name: string;
  description?: string;
  commerce?: {
    provider: CommerceProvider;
    baseUrl: string;
    credentials?: {
      consumerKey: string;
      consumerSecret: string;
    };
  };
}

export interface ClientUserCredentials {
  email: string;
  password: string;
}

export interface Client {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  products: Product[];
  categories?: string[]; // Unique category list derived from products
  studioSessions?: StudioSession[]; // Multi-product sessions
  clientSessions?: StudioSession[]; // Legacy alias
  sceneStudios?: SceneStudio[]; // Scene generation workspaces
  commerce?: CommerceConfig;
  aiModelConfig?: AIModelConfig; // AI model preferences for image generation
}

// ===== DATA CONTEXT STATE =====
export interface DataContextState {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
}

// ===== S3 PATHS =====
export interface S3Paths {
  getClientPath: (clientId: string) => string;
  getProductPath: (clientId: string, productId: string) => string;
  getSessionPath: (clientId: string, productId: string, sessionId: string) => string;
  getChatJsonPath: (clientId: string, productId: string, sessionId: string) => string;
  getMediaPath: (clientId: string, productId: string, sessionId: string) => string;
  getMediaFilePath: (clientId: string, productId: string, sessionId: string, filename: string) => string;
}

// ===== IMAGE DATA =====
export interface ImageData {
  id: string;
  url?: string; // S3 URL or local URL
  dataUrl?: string; // Base64 data URL for local display
  filename: string;
}

// ===== UI STATE =====
export interface ActiveSelection {
  clientId: string | null;
  productId: string | null;
  sessionId: string | null;
}

// ===== NAVIGATION VIEW =====
export type NavigationView = 'clients' | 'products' | 'sessions' | 'clientSessions';

// ===== MENU STATE =====
export interface MenuState {
  type: 'session' | 'product' | 'client';
  id: string;
}

// ===== MODAL STATE =====
export type ModalType = 'add-client' | 'add-product' | 'edit-client' | 'edit-product' | 'image-viewer' | null;

// ===== FILE UPLOAD =====
export interface FileUploadResult {
  id: string;
  filename: string;
  s3Key: string;
  url: string;
}

// ===== CHAT INPUT STATE =====
export interface ChatInputState {
  text: string;
  inspirationImage: File | null;
  inspirationImagePreview: string | null;
}

// ===== DEFAULT PROMPT SETTINGS =====
export const DEFAULT_PROMPT_SETTINGS: PromptSettings = {
  scene: 'Studio Set',
  style: 'Modern Minimalist',
  lighting: 'Studio Soft Light',
  surroundings: 'Minimal (No Props)',
  aspectRatio: '1:1 (Square)',
  numberOfVariants: 1,
};

/**
 * Create a deep clone of the default prompt settings to avoid shared references in state.
 */
export function cloneDefaultPromptSettings(): PromptSettings {
  return JSON.parse(JSON.stringify(DEFAULT_PROMPT_SETTINGS)) as PromptSettings;
}

/**
 * Normalize prompt settings by ensuring all required fields exist, falling back to defaults as needed.
 */
export function normalizePromptSettings(settings?: PromptSettings): PromptSettings {
  if (!settings) {
    return cloneDefaultPromptSettings();
  }

  return {
    ...cloneDefaultPromptSettings(),
    ...settings,
  };
}

// ===== SCENE STUDIO =====

/**
 * Scene - A backdrop/environment for product visualization
 */
export interface Scene {
  id: string;
  name: string;
  imageUrl: string;
  category?: string;
  isStock?: boolean; // True for pre-loaded scenes, false for user-uploaded
}

/**
 * Generation settings for Scene Studio output slots
 */
export interface SceneGenerationSettings {
  scene: Scene;
  sceneType: string;
  style: string;
  lighting: string;
  cameraAngle: string;
  aspectRatio: string;
  surroundings: string;
  colorScheme: string;
  props: string[];
  varietyLevel: number; // 1-10
  colorTheme: boolean; // Match product colors
  accessories: boolean; // Add complementary items
  promptText: string; // Freeform custom instructions
}

/**
 * Status of an output slot
 */
export enum SlotStatus {
  EMPTY = 'EMPTY',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

/**
 * Generated image with full metadata
 */
export interface GeneratedSceneImage {
  id: string;
  url: string;
  timestamp: number;
  productIds: string[];
  productNames: string[];
  settings: SceneGenerationSettings;
  debugPrompt?: string;
}

/**
 * Output slot configuration - represents a single generation row/sequence
 */
export interface OutputSlotConfig {
  id: string;
  productIds: string[]; // Products to include in this generation
  status: SlotStatus;
  outputImage?: string; // Current displayed image
  history: GeneratedSceneImage[]; // All generated variations
  settings: SceneGenerationSettings;
}
