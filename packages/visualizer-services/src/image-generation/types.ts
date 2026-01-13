/**
 * Core types for image generation - Queue implementation is app-specific
 */

export type JobStatus = 'pending' | 'generating' | 'completed' | 'error';

export interface ImageGenerationRequest {
  clientId: string;
  productId: string;
  sessionId: string;
  prompt: string;
  settings: any;
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
