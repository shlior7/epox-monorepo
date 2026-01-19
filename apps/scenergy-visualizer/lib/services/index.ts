// ===== MAIN SERVICES EXPORTS =====

// Services (classes for explicit instantiation)
export { GeminiService } from 'visualizer-ai';
export { VisualizationService, getVisualizationService } from './visualization';

// Lazy singleton - only instantiates when methods are called
export { visualizationService } from './visualization';

// Types
export type {
  // Shared types
  ProductAsset,
  VisualizationRequest,
  GenerationSession,
  VariantPreview,
  ProductAnalysis,
} from './shared';

export type {
  // Gemini types
  GeminiGenerationRequest,
  GeminiGenerationResponse,
} from 'visualizer-ai';

// Utilities and constants
export * from './shared/utils';
export * from './shared/constants';

// Re-export the main service getter for convenience
export { getVisualizationService as default } from './visualization';
