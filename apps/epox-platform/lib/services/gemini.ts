/**
 * Gemini Service - Re-exports from visualizer-ai
 * All AI generation logic lives in the AI package
 */

// Re-export everything from the shared Gemini service
export { GeminiService, getGeminiService } from 'visualizer-ai';

export type {
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  EditImageRequest,
  EditImageResponse,
  ComponentAnalysisResult,
  SceneAnalysisResult,
  AdjustmentHint,
} from 'visualizer-ai';
