/**
 * Queue Types
 * Types for AI job queue operations (scenergy-queue)
 */

import type { FlowGenerationSettings, ImageQuality } from './settings';

// ============================================================================
// JOB TYPES
// ============================================================================

/** Types of AI jobs that can be queued */
export type AIJobType = 'image_generation' | 'image_edit' | 'video_generation' | 'upscale' | 'background_removal';

/** Job status states */
export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed';

/** Priority levels for jobs */
export type JobPriority = 'urgent' | 'high' | 'normal' | 'low' | 'batch';

export const JOB_PRIORITIES: Record<JobPriority, number> = {
  urgent: 1,
  high: 2,
  normal: 5,
  low: 8,
  batch: 10,
} as const;

// ============================================================================
// JOB PAYLOADS
// ============================================================================

/** Base payload shared by all jobs */
export interface BaseJobPayload {
  clientId: string;
  sessionId?: string;
  userId?: string;
}

/**
 * Image generation job payload
 *
 * One job = one generated asset (which can combine multiple products)
 *
 * Example: mattress + bed → ONE lifestyle image showing both together
 * - productIds: ['mattress-123', 'bed-456']
 * - productImageUrls: ['https://.../mattress.png', 'https://.../bed.png']
 * - Result: ONE generated asset linked to both products
 */
export interface ImageGenerationPayload extends BaseJobPayload {
  /** Product IDs to include in this generation (all combined into one image) */
  productIds: string[];
  /** Prompt describing the desired output */
  prompt: string;
  /** Product images to use as input (one per productId, same order) */
  productImageUrls?: string[];
  /** Additional inspiration/reference images */
  inspirationImageUrls?: string[];
  /** Generation settings */
  settings?: ImageGenerationSettings;
}

/** Settings for image generation */
export interface ImageGenerationSettings extends Record<string, unknown> {
  aspectRatio?: string;
  imageQuality?: ImageQuality;
  /** Number of variant images to generate */
  variants?: number;
  model?: string;
}

/** Image edit job payload */
export interface ImageEditPayload extends BaseJobPayload {
  sourceImageUrl: string;
  editPrompt: string;
  maskImageUrl?: string;
  settings?: {
    model?: string;
  };
}

/** Video generation job payload */
export interface VideoGenerationPayload extends BaseJobPayload {
  sourceImageUrl: string;
  prompt?: string;
  duration?: number;
  settings?: {
    model?: string;
    fps?: number;
  };
}

/** Upscale job payload */
export interface UpscalePayload extends BaseJobPayload {
  sourceImageUrl: string;
  scale?: 2 | 4;
}

/** Background removal job payload */
export interface BackgroundRemovalPayload extends BaseJobPayload {
  sourceImageUrl: string;
}

/** Map job types to their payloads */
export interface JobPayloadMap {
  image_generation: ImageGenerationPayload;
  image_edit: ImageEditPayload;
  video_generation: VideoGenerationPayload;
  upscale: UpscalePayload;
  background_removal: BackgroundRemovalPayload;
}

/** Get payload type for a job type */
export type JobPayload<T extends AIJobType> = JobPayloadMap[T];

// ============================================================================
// JOB RESULTS
// ============================================================================

/** Base result shared by all jobs */
export interface BaseJobResult {
  success: boolean;
  error?: string;
  duration?: number;
  cost?: number;
}

/** Image generation result */
export interface ImageGenerationResult extends BaseJobResult {
  /** URLs of generated images */
  imageUrls: string[];
  /** Database IDs of generated assets */
  imageIds: string[];
}

/** Image edit result */
export interface ImageEditResult extends BaseJobResult {
  imageUrl: string;
  imageId: string;
}

/** Video generation result */
export interface VideoGenerationResult extends BaseJobResult {
  videoUrl: string;
  videoId: string;
}

/** Upscale result */
export interface UpscaleResult extends BaseJobResult {
  imageUrl: string;
  imageId: string;
}

/** Background removal result */
export interface BackgroundRemovalResult extends BaseJobResult {
  imageUrl: string;
  imageId: string;
}

/** Map job types to their results */
export interface JobResultMap {
  image_generation: ImageGenerationResult;
  image_edit: ImageEditResult;
  video_generation: VideoGenerationResult;
  upscale: UpscaleResult;
  background_removal: BackgroundRemovalResult;
}

/** Get result type for a job type */
export type JobResult<T extends AIJobType> = JobResultMap[T];

// ============================================================================
// JOB INFO
// ============================================================================

/** Job information returned by queue operations */
export interface JobInfo<T extends AIJobType = AIJobType> {
  id: string;
  type: T;
  status: JobStatus;
  progress: number;
  payload: JobPayload<T>;
  result?: JobResult<T>;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
}

/** Enqueue options */
export interface EnqueueOptions {
  priority?: JobPriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

/** Queue statistics */
export interface QueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Queue client configuration */
export interface QueueClientConfig {
  redisUrl: string;
  queueName?: string;
}

/** Worker configuration */
export interface WorkerConfig {
  redisUrl: string;
  queueName?: string;
  /** Max parallel jobs */
  concurrency?: number;
  /** Rate limit in requests per minute (matches Gemini RPM limits) */
  maxJobsPerMinute?: number;
}
