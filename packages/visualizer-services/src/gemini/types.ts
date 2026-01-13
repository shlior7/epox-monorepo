// ===== GEMINI SERVICE TYPES =====

export interface AIModelOverrides {
  imageModel?: string;
  fallbackImageModel?: string;
}

export interface GeminiGenerationRequest {
  prompt: string;
  imageAsset?: File; // Legacy: Primary image (for backwards compatibility)
  imageAssets?: File[]; // Legacy: Multiple images (for backwards compatibility)
  productImages?: File[]; // Product reference images
  inspirationImages?: File[]; // Inspiration/style reference images
  model?: string;
  modelOverrides?: AIModelOverrides; // Per-request model configuration
  maxTokens?: number;
  count?: number; // Number of images to generate
  aspectRatio?: string; // Image aspect ratio
  imageQuality?: '1k' | '2k' | '4k'; // Output image resolution
}

export interface GeminiGenerationResponse {
  id: string;
  images: Array<{
    url: string;
    format: string;
    width: number;
    height: number;
  }>;
  metadata: {
    model: string;
    prompt: string;
    generatedAt: string;
    originalPrompt?: string; // Original prompt before optimization
    tokensUsed?: number; // Token usage for cost tracking
    cost?: number; // Estimated cost in USD
    fallback?: boolean; // Whether fallback model was used
    mock?: boolean; // Whether this is a mock response
  };
}

// ===== EDIT IMAGE TYPES =====

/** Edit modes for image editing - helps guide the model */
export type ImageEditMode =
  | 'default' // General editing
  | 'inpaint_removal' // Remove objects/elements
  | 'inpaint_insertion' // Add new objects/elements
  | 'outpaint' // Extend image beyond borders
  | 'controlled_editing' // Precise edits with control
  | 'style' // Change style/look
  | 'background_swap' // Replace background
  | 'product_image'; // Product-specific editing

export interface EditImageRequest {
  baseImageDataUrl: string; // Base64 data URL of the image to edit
  prompt: string; // Edit instructions
  aspectRatio?: string; // Propagate from flow settings
  modelOverrides?: AIModelOverrides; // Per-request model configuration
  /** Optional edit mode hint - if not provided, auto-detected from prompt */
  editMode?: ImageEditMode;
  referenceImages?: Array<{
    componentName: string;
    imageDataUrl?: string;
  }>;
}

export interface EditImageResponse {
  editedImageDataUrl?: string;
}

// ===== ANALYSIS TYPES =====

/** AI-powered adjustment hint for one-click improvements */
export interface AdjustmentHint {
  id: string;
  label: string; // "Brighten the image"
  description: string; // "The scene appears underexposed"
  prompt: string; // Gemini edit prompt to apply this adjustment
  icon: 'sun' | 'thermometer' | 'palette' | 'contrast' | 'sparkles' | 'eye'; // Icon for UI
  category: 'lighting' | 'color' | 'composition' | 'style';
}

export interface ComponentAnalysisResult {
  components: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  overallDescription: string;
  suggestedAdjustments?: AdjustmentHint[]; // AI-powered improvement hints
}

export interface SceneAnalysisResult {
  roomType: string;
  style: string;
  lighting: string;
  cameraAngle: string;
  surroundings: string;
  colorScheme: string;
  props: string[];
  promptText: string;
}
