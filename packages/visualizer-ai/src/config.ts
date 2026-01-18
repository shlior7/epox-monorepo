import { DEFAULT_AI_MODEL_CONFIG, OPTIMIZATION_DEFAULTS } from './constants';

export interface VertexConfig {
  /** Google Cloud project ID */
  project?: string;
  /** Google Cloud region (e.g., 'us-central1') */
  location?: string;
}

export interface GeminiConfig {
  apiKey?: string;
  endpoint?: string;
  /** Enable Vertex AI mode (uses Google Cloud credentials instead of API key) */
  useVertex?: boolean;
  /** Vertex AI configuration (required when useVertex is true) */
  vertex?: VertexConfig;
  imageModel: string;
  editModel: string;
  fallbackImageModel: string;
  textModel: string;
  fallbackTextModel: string;
}

export interface OptimizationConfig {
  maxPromptTokens: number;
  defaultImageCount: number;
  defaultImageSize: string;
  defaultAspectRatio: string;
  maxRetries: number;
  enableBatchRequests?: boolean;
  enableContextCaching?: boolean;
  useFreeTierWhenPossible?: boolean;
}

export interface AIServiceConfig {
  gemini: GeminiConfig;
  optimization?: OptimizationConfig;
}

export function createDefaultConfig(): AIServiceConfig {
  const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';

  return {
    gemini: {
      apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
      endpoint: process.env.GEMINI_API_ENDPOINT ?? 'https://generativelanguage.googleapis.com/v1beta',
      useVertex,
      vertex: useVertex
        ? {
            project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
            location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
          }
        : undefined,
      imageModel: DEFAULT_AI_MODEL_CONFIG.imageModel,
      editModel: DEFAULT_AI_MODEL_CONFIG.editModel,
      fallbackImageModel: DEFAULT_AI_MODEL_CONFIG.fallbackImageModel,
      textModel: DEFAULT_AI_MODEL_CONFIG.textModel,
      fallbackTextModel: DEFAULT_AI_MODEL_CONFIG.fallbackTextModel,
    },
    optimization: {
      maxPromptTokens: OPTIMIZATION_DEFAULTS.MAX_PROMPT_TOKENS,
      defaultImageCount: OPTIMIZATION_DEFAULTS.DEFAULT_IMAGE_COUNT,
      defaultImageSize: OPTIMIZATION_DEFAULTS.DEFAULT_IMAGE_SIZE,
      defaultAspectRatio: OPTIMIZATION_DEFAULTS.DEFAULT_ASPECT_RATIO,
      maxRetries: OPTIMIZATION_DEFAULTS.MAX_RETRIES,
      enableBatchRequests: true,
      enableContextCaching: true,
      useFreeTierWhenPossible: true,
    },
  };
}

export function validateApiKeys(config: AIServiceConfig) {
  const missing: string[] = [];

  if (config.gemini.useVertex) {
    // Vertex AI mode - requires project ID (credentials come from ADC or service account)
    if (!config.gemini.vertex?.project) {
      missing.push('GOOGLE_CLOUD_PROJECT');
    }
  } else {
    // AI Studio mode - requires API key
    if (!config.gemini.apiKey) {
      missing.push('GOOGLE_AI_STUDIO_API_KEY');
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

