/**
 * Image Generation Types
 *
 * Legacy types for in-memory queue. For production, use scenergy-queue
 * with types from visualizer-types.
 *
 * @deprecated Use types from 'visualizer-types' for new code
 */

/**
 * @deprecated Use JobStatus from 'visualizer-types' instead
 */
export type JobStatus = 'pending' | 'generating' | 'completed' | 'error';

/**
 * Legacy request format for in-memory queue
 * @deprecated Use ImageGenerationPayload from 'visualizer-types' for scenergy-queue
 */
export interface ImageGenerationRequest {
  clientId: string;
  productId: string;
  sessionId: string;
  prompt: string;
  settings: Record<string, unknown>;
  productImageId?: string;
  productImageIds?: Array<{ productId: string; imageId: string }>;
  inspirationImageId?: string;
  inspirationImageUrl?: string;
  isClientSession?: boolean;
  modelOverrides?: {
    imageModel?: string;
    fallbackImageModel?: string;
  };
}

/**
 * Legacy job format for in-memory queue
 * @deprecated Use JobInfo from 'visualizer-types' for scenergy-queue
 */
export interface ImageGenerationJob {
  id: string;
  request: ImageGenerationRequest;
  status: JobStatus;
  imageIds: string[];
  error: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
