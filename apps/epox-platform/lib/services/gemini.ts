/**
 * Gemini Service - Re-exports from shared visualizer-services
 * All AI generation logic lives in the shared package
 */

// Re-export everything from the shared Gemini service
export { GeminiService, getGeminiService } from 'visualizer-services';

export type {
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  EditImageRequest,
  EditImageResponse,
  ComponentAnalysisResult,
  SceneAnalysisResult,
  AdjustmentHint,
} from 'visualizer-services';
