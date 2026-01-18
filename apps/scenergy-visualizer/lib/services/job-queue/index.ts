/**
 * Job Queue Client
 *
 * Simple client for enqueueing and querying jobs from PostgreSQL.
 * Replaces Redis-based queue with direct database access.
 */

import { getDb } from 'visualizer-db';
import { generationJob, type ImageGenerationPayload, type JobStatus, type JobResult } from 'visualizer-db/schema';
import { eq } from 'drizzle-orm';

// Get the raw Drizzle client for direct queries
const drizzle = getDb();

// ============================================================================
// TYPES
// ============================================================================

export interface EnqueueResult {
  jobId: string;
  expectedImageIds: string[];
}

export interface JobStatusResult {
  id: string;
  status: JobStatus;
  progress: number;
  imageIds: string[];
  error: string | null;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// QUEUE CLIENT
// ============================================================================

/**
 * Enqueue an image generation job
 */
export async function enqueueImageGeneration(
  clientId: string,
  payload: ImageGenerationPayload,
  options?: { priority?: number; flowId?: string }
): Promise<EnqueueResult> {
  const numberOfVariants = payload.settings?.numberOfVariants ?? 1;

  // Pre-generate expected image IDs
  const expectedImageIds: string[] = [];
  for (let i = 0; i < numberOfVariants; i++) {
    expectedImageIds.push(`generated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
  }

  const [job] = await drizzle.insert(generationJob)
    .values({
      clientId,
      flowId: options?.flowId,
      type: 'image_generation',
      payload,
      priority: options?.priority ?? 100,
    })
    .returning({ id: generationJob.id });

  console.log(`✅ Job ${job.id} enqueued for ${numberOfVariants} variants`);

  return { jobId: job.id, expectedImageIds };
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResult | null> {
  const [job] = await drizzle.select({
    id: generationJob.id,
    status: generationJob.status,
    progress: generationJob.progress,
    result: generationJob.result,
    error: generationJob.error,
    createdAt: generationJob.createdAt,
    startedAt: generationJob.startedAt,
    completedAt: generationJob.completedAt,
  })
    .from(generationJob)
    .where(eq(generationJob.id, jobId));

  if (!job) return null;

  const result = job.result as JobResult | null;

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    imageIds: result?.imageIds ?? [],
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.startedAt ?? undefined,
    completedAt: job.completedAt ?? undefined,
  };
}

/**
 * Get all jobs for a session
 */
export async function getJobsBySession(sessionId: string): Promise<JobStatusResult[]> {
  const jobs = await drizzle.select({
    id: generationJob.id,
    status: generationJob.status,
    progress: generationJob.progress,
    result: generationJob.result,
    error: generationJob.error,
    createdAt: generationJob.createdAt,
    startedAt: generationJob.startedAt,
    completedAt: generationJob.completedAt,
    payload: generationJob.payload,
  })
    .from(generationJob);

  // Filter by sessionId in payload (stored in JSONB)
  return jobs
    .filter(job => {
      const payload = job.payload as ImageGenerationPayload;
      return payload.sessionId === sessionId;
    })
    .map(job => {
      const result = job.result as JobResult | null;
      return {
        id: job.id,
        status: job.status,
        progress: job.progress,
        imageIds: result?.imageIds ?? [],
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.startedAt ?? undefined,
        completedAt: job.completedAt ?? undefined,
      };
    });
}

// Legacy compatibility wrapper
export const imageGenerationQueue = {
  async enqueue(request: {
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
  }): Promise<EnqueueResult> {
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

