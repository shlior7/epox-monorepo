/**
 * Generation Queue Facade
 *
 * Provides a thin wrapper over visualizer-db generation jobs
 * so apps do not depend on the queue implementation details.
 */

import { getDb } from 'visualizer-db';
import { GenerationJobRepository } from 'visualizer-db/repositories/generation-jobs';
import type {
  ImageGenerationPayload,
  ImageEditPayload,
  VideoGenerationPayload,
  JobResult,
  JobStatus,
  JobType,
} from 'visualizer-db/schema';

let jobs: GenerationJobRepository | null = null;

function getJobs(): GenerationJobRepository {
  if (!jobs) {
    jobs = new GenerationJobRepository(getDb());
  }
  return jobs;
}

export interface EnqueueImageResult {
  jobId: string;
  expectedImageIds: string[];
}

export interface EnqueueVideoResult {
  jobId: string;
}

export interface JobStatusResult {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  imageIds?: string[];
  result: JobResult | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

function buildExpectedImageIds(count: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    ids.push(`generated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
  }
  return ids;
}

/**
 * Enqueue an image generation job.
 */
export async function enqueueImageGeneration(
  clientId: string,
  payload: ImageGenerationPayload,
  options?: { priority?: number; flowId?: string }
): Promise<EnqueueImageResult> {
  const numberOfVariants = payload.settings?.numberOfVariants ?? 1;
  const expectedImageIds = buildExpectedImageIds(numberOfVariants);

  const job = await getJobs().create({
    clientId,
    type: 'image_generation',
    payload,
    flowId: options?.flowId,
    priority: options?.priority,
  });

  return { jobId: job.id, expectedImageIds };
}

/**
 * Enqueue a video generation job.
 */
export async function enqueueVideoGeneration(
  clientId: string,
  payload: VideoGenerationPayload,
  options?: { priority?: number; flowId?: string }
): Promise<EnqueueVideoResult> {
  const job = await getJobs().create({
    clientId,
    type: 'video_generation',
    payload,
    flowId: options?.flowId,
    priority: options?.priority,
  });

  return { jobId: job.id };
}

/**
 * Enqueue an image edit job.
 */
export async function enqueueImageEdit(
  clientId: string,
  payload: ImageEditPayload,
  options?: { priority?: number; flowId?: string }
): Promise<EnqueueVideoResult> {
  const job = await getJobs().create({
    clientId,
    type: 'image_edit',
    payload,
    flowId: options?.flowId,
    priority: options?.priority,
  });

  return { jobId: job.id };
}

/**
 * Get job status by ID.
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResult | null> {
  const job = await getJobs().getById(jobId);
  if (!job) {
    return null;
  }

  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    imageIds: job.result?.imageIds,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.completedAt ?? job.startedAt ?? job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

/**
 * Get job statuses by flow ID.
 */
export async function getJobsByFlow(flowId: string): Promise<JobStatusResult[]> {
  const flowJobs = await getJobs().listByFlow(flowId);
  return flowJobs.map((job) => ({
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    imageIds: job.result?.imageIds,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.completedAt ?? job.startedAt ?? job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }));
}
