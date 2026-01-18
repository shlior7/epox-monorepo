/**
 * Queue Testkit
 *
 * Provides test utilities for testing queue operations.
 * Includes Redis helpers, job creation utilities, and assertion helpers.
 *
 * @example
 * ```ts
 * import { createTestQueue, waitForJobCompletion, assertJobCompleted } from 'scenergy-queue/testkit';
 *
 * const { client, cleanup } = await createTestQueue();
 * const { jobId } = await client.enqueue('image_generation', payload);
 * await waitForJobCompletion(jobId);
 * await assertJobCompleted(jobId);
 * await cleanup();
 * ```
 */

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { QueueClient, createQueueClient } from './queue/client';
import { setJobStatus, getJobStatus, deleteJobStatus, type JobStatus } from './job-status';
import type {
  ImageGenerationPayload,
  ImageEditPayload,
  ImageGenerationResult,
  ImageEditResult,
  AIJobType,
  JobPayload,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface TestQueueConfig {
  redisUrl?: string;
  queueName?: string;
}

const DEFAULT_CONFIG: Required<TestQueueConfig> = {
  redisUrl: process.env.TEST_REDIS_URL ?? 'redis://localhost:6399',
  queueName: `test-queue-${Date.now()}`,
};

// ============================================================================
// TEST QUEUE SETUP
// ============================================================================

export interface TestQueueSetup {
  client: QueueClient;
  redis: Redis;
  queueName: string;
  /** Clean up all resources */
  cleanup: () => Promise<void>;
  /** Clear all jobs from queue */
  clearJobs: () => Promise<void>;
  /** Clear job status cache */
  clearStatus: () => Promise<void>;
}

/**
 * Create a test queue with isolated name and cleanup
 */
export async function createTestQueue(config?: TestQueueConfig): Promise<TestQueueSetup> {
  const redisUrl = config?.redisUrl ?? DEFAULT_CONFIG.redisUrl;
  const queueName = config?.queueName ?? `test-queue-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const client = createQueueClient({ redisUrl, queueName });

  async function clearJobs(): Promise<void> {
    const keys = await redis.keys(`bull:${queueName}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  async function clearStatus(): Promise<void> {
    const keys = await redis.keys('job-status:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  async function cleanup(): Promise<void> {
    await clearJobs();
    await clearStatus();
    await client.close();
    await redis.quit();
  }

  return {
    client,
    redis,
    queueName,
    cleanup,
    clearJobs,
    clearStatus,
  };
}

// ============================================================================
// TEST WORKER
// ============================================================================

export type JobProcessor = (job: Job) => Promise<unknown>;

export interface TestWorkerConfig {
  redisUrl?: string;
  queueName: string;
  concurrency?: number;
  processor?: JobProcessor;
}

/**
 * Create a simple test worker
 */
export function createTestWorker(config: TestWorkerConfig): Worker {
  const processor = config.processor ?? defaultProcessor;

  return new Worker(config.queueName, processor, {
    connection: {
      url: config.redisUrl ?? DEFAULT_CONFIG.redisUrl,
      maxRetriesPerRequest: null,
    },
    concurrency: config.concurrency ?? 1,
  });
}

async function defaultProcessor(job: Job): Promise<unknown> {
  const type = job.name as AIJobType;

  // Update status to active
  await setJobStatus(job.id!, {
    id: job.id!,
    type,
    status: 'active',
    progress: 0,
  });

  // Simulate work
  await new Promise((r) => setTimeout(r, 50));

  // Generate mock result
  const result =
    type === 'image_generation'
      ? { success: true, imageUrls: [`mock://image/${job.id}`], imageIds: [`img-${job.id}`] }
      : { success: true, imageUrl: `mock://image/${job.id}`, imageId: `img-${job.id}` };

  // Update status to completed
  await setJobStatus(job.id!, {
    id: job.id!,
    type,
    status: 'completed',
    progress: 100,
    result,
  });

  return result;
}

// ============================================================================
// WAIT UTILITIES
// ============================================================================

export interface WaitOptions {
  timeout?: number;
  pollInterval?: number;
}

/**
 * Wait for a job to reach a specific status
 */
export async function waitForJobStatus(
  jobId: string,
  targetStatus: JobStatus['status'] | JobStatus['status'][],
  options?: WaitOptions
): Promise<JobStatus> {
  const timeout = options?.timeout ?? 10000;
  const pollInterval = options?.pollInterval ?? 100;
  const targets = Array.isArray(targetStatus) ? targetStatus : [targetStatus];

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getJobStatus(jobId);

    if (status && targets.includes(status.status)) {
      return status;
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error(
    `Timeout waiting for job ${jobId} to reach status ${targets.join(' or ')} after ${timeout}ms`
  );
}

/**
 * Wait for a job to complete (success or failure)
 */
export async function waitForJobCompletion(
  jobId: string,
  options?: WaitOptions
): Promise<JobStatus> {
  return waitForJobStatus(jobId, ['completed', 'failed'], options);
}

/**
 * Wait for multiple jobs to complete
 */
export async function waitForJobsCompletion(
  jobIds: string[],
  options?: WaitOptions
): Promise<Map<string, JobStatus>> {
  const results = new Map<string, JobStatus>();

  await Promise.all(
    jobIds.map(async (jobId) => {
      const status = await waitForJobCompletion(jobId, options);
      results.set(jobId, status);
    })
  );

  return results;
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a job completed successfully
 */
export async function assertJobCompleted(jobId: string): Promise<JobStatus> {
  const status = await getJobStatus(jobId);

  if (!status) {
    throw new Error(`Job ${jobId} not found in status cache`);
  }

  if (status.status !== 'completed') {
    throw new Error(
      `Expected job ${jobId} to be completed but it is ${status.status}` +
        (status.error ? `: ${status.error}` : '')
    );
  }

  return status;
}

/**
 * Assert that a job failed
 */
export async function assertJobFailed(jobId: string, expectedError?: string): Promise<JobStatus> {
  const status = await getJobStatus(jobId);

  if (!status) {
    throw new Error(`Job ${jobId} not found in status cache`);
  }

  if (status.status !== 'failed') {
    throw new Error(`Expected job ${jobId} to be failed but it is ${status.status}`);
  }

  if (expectedError && status.error !== expectedError) {
    throw new Error(`Expected error "${expectedError}" but got "${status.error}"`);
  }

  return status;
}

/**
 * Assert job result contains expected data
 */
export async function assertJobResult(
  jobId: string,
  expected: Partial<ImageGenerationResult | ImageEditResult>
): Promise<void> {
  const status = await assertJobCompleted(jobId);

  if (!status.result) {
    throw new Error(`Job ${jobId} has no result`);
  }

  for (const [key, value] of Object.entries(expected)) {
    const actual = (status.result as Record<string, unknown>)[key];
    if (JSON.stringify(actual) !== JSON.stringify(value)) {
      throw new Error(
        `Expected result.${key} to be ${JSON.stringify(value)} but got ${JSON.stringify(actual)}`
      );
    }
  }
}

/**
 * Assert progress reached a specific value
 */
export async function assertJobProgress(jobId: string, minProgress: number): Promise<void> {
  const status = await getJobStatus(jobId);

  if (!status) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (status.progress < minProgress) {
    throw new Error(`Expected progress >= ${minProgress} but got ${status.progress}`);
  }
}

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

/**
 * Generate a test image generation payload
 */
export function createTestImageGenerationPayload(
  overrides?: Partial<ImageGenerationPayload>
): ImageGenerationPayload {
  return {
    clientId: 'test-client',
    sessionId: `test-session-${Date.now()}`,
    productIds: ['prod-1'],
    prompt: 'Test image generation prompt',
    settings: {
      aspectRatio: '1:1',
      imageQuality: '2k',
      variants: 1,
    },
    ...overrides,
  };
}

/**
 * Generate a test image edit payload
 */
export function createTestImageEditPayload(
  overrides?: Partial<ImageEditPayload>
): ImageEditPayload {
  return {
    clientId: 'test-client',
    sourceImageUrl: 'data:image/png;base64,test',
    editPrompt: 'Test edit prompt',
    ...overrides,
  };
}

/**
 * Generate multiple test payloads
 */
export function createTestPayloadBatch(
  count: number,
  generator?: (index: number) => Partial<ImageGenerationPayload>
): ImageGenerationPayload[] {
  return Array.from({ length: count }, (_, i) =>
    createTestImageGenerationPayload({
      productIds: [`prod-${i}`],
      prompt: `Batch test ${i}`,
      ...(generator?.(i) ?? {}),
    })
  );
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

/**
 * Clean up all test data from Redis
 */
export async function cleanupTestData(
  redis: Redis,
  options?: { queuePattern?: string }
): Promise<void> {
  const patterns = [
    options?.queuePattern ?? 'bull:test-*',
    'job-status:*',
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

