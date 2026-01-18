/**
 * Scenergy Queue
 *
 * AI job queue for heavy operations (image/video generation, edits)
 * that would timeout on serverless functions.
 */

// Queue Client (for use in Vercel/API routes)
export { QueueClient, createQueueClient, getQueueClient } from './queue/client';

// Worker (for use in Cloud Run)
export { QueueWorker } from './queue/worker';

// Persistence (for worker use)
export { saveGeneratedImage, saveGeneratedImages } from './persistence';
export type { SaveImageParams, SavedImage } from './persistence';

// Job Status (for polling)
export { getJobStatus, getJobStatuses, setJobStatus, deleteJobStatus } from './job-status';
export type { JobStatus as JobStatusInfo, JobStatusState } from './job-status';

// Types (re-exported from visualizer-types)
export type {
  AIJobType,
  JobStatus,
  JobPriority,
  BaseJobPayload,
  ImageGenerationPayload,
  ImageGenerationSettings,
  ImageEditPayload,
  VideoGenerationPayload,
  UpscalePayload,
  BackgroundRemovalPayload,
  JobPayload,
  BaseJobResult,
  ImageGenerationResult,
  ImageEditResult,
  VideoGenerationResult,
  UpscaleResult,
  BackgroundRemovalResult,
  JobResult,
  QueueClientConfig,
  WorkerConfig,
  JobInfo,
  EnqueueOptions,
  QueueStats,
} from './types';

export { JOB_PRIORITIES } from './types';
