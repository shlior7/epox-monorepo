/**
 * Image Generation Service Exports
 *
 * Now uses PostgreSQL-based queue instead of Redis.
 */

// New PostgreSQL-based queue (primary)
export { imageGenerationQueue, getJobStatus, enqueueImageGeneration } from '../job-queue';
export type { JobStatusResult, EnqueueResult } from '../job-queue';

// Legacy types for compatibility
export type ImageGenerationJob = {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  imageIds: string[];
  error: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type ImageGenerationRequest = {
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
  modelOverrides?: { imageModel?: string; fallbackImageModel?: string };
};

