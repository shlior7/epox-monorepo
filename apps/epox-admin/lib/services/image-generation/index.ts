/**
 * Image Generation Service Exports
 *
 * Now uses PostgreSQL-based queue instead of Redis.
 */

import { enqueueImageGeneration, getJobStatus } from 'visualizer-ai';
import type { EnqueueImageResult, JobStatusResult } from 'visualizer-ai';
import type { ImageGenerationPayload } from 'visualizer-db/schema';

// New PostgreSQL-based queue (primary)
export { enqueueImageGeneration, getJobStatus };
export type { EnqueueImageResult as EnqueueResult, JobStatusResult };

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

export const imageGenerationQueue = {
  async enqueue(request: ImageGenerationRequest): Promise<EnqueueImageResult> {
    const payload: ImageGenerationPayload = {
      prompt: request.prompt,
      productIds: [request.productId],
      sessionId: request.sessionId,
      settings: {
        aspectRatio: request.settings?.aspectRatio,
        imageQuality: request.settings?.imageQuality,
        numberOfVariants: request.settings?.numberOfVariants ?? 1,
      },
      productImageId: request.productImageId,
      productImageIds: request.productImageIds,
      inspirationImageId: request.inspirationImageId,
      inspirationImageUrl: request.inspirationImageUrl,
      isClientSession: request.isClientSession,
      modelOverrides: request.modelOverrides,
    };

    return enqueueImageGeneration(request.clientId, payload);
  },

  async get(jobId: string): Promise<JobStatusResult | null> {
    return getJobStatus(jobId);
  },
};
