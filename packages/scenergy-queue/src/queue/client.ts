/**
 * Queue Client
 *
 * Lightweight client for enqueueing jobs from Vercel/serverless functions.
 * Does not include worker code to minimize bundle size.
 */

import type { Job } from 'bullmq';
import { Queue } from 'bullmq';
import type {
  AIJobType,
  JobPayload,
  JobResult,
  EnqueueOptions,
  JobStatus,
  QueueClientConfig,
  QueueStats,
} from '../types';
import { JOB_PRIORITIES } from '../types';

/** Job information returned by queue operations */
interface JobInfo<T extends AIJobType> {
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

const DEFAULT_QUEUE_NAME = 'ai-jobs';

/**
 * Queue client for enqueueing AI jobs
 */
export class QueueClient {
  private queue: Queue;
  private readonly queueName: string;

  constructor(config: QueueClientConfig) {
    this.queueName = config.queueName ?? DEFAULT_QUEUE_NAME;

    this.queue = new Queue(this.queueName, {
      connection: {
        url: config.redisUrl,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });
  }

  /**
   * Enqueue a job for processing
   */
  async enqueue<T extends AIJobType>(
    type: T,
    payload: JobPayload<T>,
    options?: EnqueueOptions
  ): Promise<{ jobId: string }> {
    const priority = options?.priority ? JOB_PRIORITIES[options.priority] : JOB_PRIORITIES.normal;

    const job = await this.queue.add(type, payload, {
      priority,
      delay: options?.delay,
      attempts: options?.attempts ?? 3,
      backoff: options?.backoff ?? {
        type: 'exponential',
        delay: 1000,
      },
    });

    return { jobId: job.id! };
  }

  /**
   * Get a job by ID
   */
  async getJob<T extends AIJobType>(jobId: string): Promise<JobInfo<T> | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) {return null;}

    return this.mapJobToInfo<T>(job);
  }

  /**
   * Get multiple jobs by IDs
   */
  async getJobs<T extends AIJobType>(jobIds: string[]): Promise<Array<JobInfo<T>>> {
    const jobs = await Promise.all(jobIds.map((id) => this.queue.getJob(id)));

    return jobs.filter((job): job is Job => job !== undefined).map((job) => this.mapJobToInfo<T>(job));
  }

  /**
   * Get jobs by session ID
   */
  async getJobsBySession<T extends AIJobType>(sessionId: string): Promise<Array<JobInfo<T>>> {
    // Get all active and waiting jobs
    const [active, waiting, completed, failed] = await Promise.all([
      this.queue.getActive(),
      this.queue.getWaiting(),
      this.queue.getCompleted(0, 100),
      this.queue.getFailed(0, 100),
    ]);

    const allJobs = [...active, ...waiting, ...completed, ...failed];

    return allJobs
      .filter((job) => (job.data as { sessionId?: string }).sessionId === sessionId)
      .map((job) => this.mapJobToInfo<T>(job));
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');

    return {
      pending: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      total: counts.waiting + counts.active + counts.completed + counts.failed + counts.delayed,
    };
  }

  /**
   * Close the queue connection
   */
  async close(): Promise<void> {
    await this.queue.close();
  }

  /**
   * Map a BullMQ job to JobInfo
   */
  private mapJobToInfo<T extends AIJobType>(job: Job): JobInfo<T> {
    const state = job.returnvalue ? 'completed' : job.failedReason ? 'failed' : 'pending';

    return {
      id: job.id!,
      type: job.name as T,
      status: this.mapState(state),
      progress: typeof job.progress === 'number' ? job.progress : 0,
      payload: job.data as JobPayload<T>,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: new Date(job.timestamp),
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      attempts: job.attemptsMade,
    };
  }

  private mapState(state: string): JobStatus {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'pending';
      case 'active':
        return 'active';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }
}

// Singleton instance
let _queueClient: QueueClient | null = null;

/**
 * Create a new queue client
 */
export function createQueueClient(config: QueueClientConfig): QueueClient {
  return new QueueClient(config);
}

/**
 * Get the singleton queue client instance
 */
export function getQueueClient(): QueueClient {
  if (!_queueClient) {
    const redisUrl = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL or UPSTASH_REDIS_URL environment variable is required');
    }
    _queueClient = new QueueClient({ redisUrl });
  }
  return _queueClient;
}

