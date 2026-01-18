/**
 * Image Generation Queue Service
 * Provides a queue interface for image generation jobs
 * 
 * Note: This is a simple in-memory implementation. For production,
 * replace with Redis/BullMQ based implementation in the app layer.
 */

import type {
  ImageGenerationRequest,
  ImageGenerationJob,
  JobStatus,
} from './types';

export interface ImageGenerationQueueConfig {
  maxConcurrent?: number;
  jobTimeoutMs?: number;
}

export interface QueueStats {
  pending: number;
  generating: number;
  completed: number;
  failed: number;
  total: number;
}

// Simple ID generator
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * In-memory queue for development/testing.
 * Production should use Redis-based queue (BullMQ) in the app layer.
 */
export class ImageGenerationQueueService {
  private jobs = new Map<string, ImageGenerationJob>();
  private readonly config: Required<ImageGenerationQueueConfig>;

  constructor(config: ImageGenerationQueueConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 3,
      jobTimeoutMs: config.jobTimeoutMs ?? 120000, // 2 minutes
    };
  }

  /**
   * Add a new job to the queue
   */
  async enqueue(request: ImageGenerationRequest): Promise<ImageGenerationJob> {
    const now = new Date().toISOString();
    const job: ImageGenerationJob = {
      id: generateJobId(),
      request,
      status: 'pending',
      imageIds: [],
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * Add multiple jobs to the queue
   */
  async enqueueBatch(requests: ImageGenerationRequest[]): Promise<ImageGenerationJob[]> {
    return Promise.all(requests.map(r => this.enqueue(r)));
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<ImageGenerationJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  /**
   * Get multiple jobs by IDs
   */
  async getJobs(jobIds: string[]): Promise<ImageGenerationJob[]> {
    return jobIds
      .map(id => this.jobs.get(id))
      .filter((job): job is ImageGenerationJob => job !== undefined);
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates?: Partial<Pick<ImageGenerationJob, 'error' | 'imageIds' | 'progress'>>
  ): Promise<ImageGenerationJob | null> {
    const job = this.jobs.get(jobId);
    if (!job) {return null;}

    job.status = status;
    job.updatedAt = new Date().toISOString();

    if (updates?.error !== undefined) {job.error = updates.error;}
    if (updates?.imageIds !== undefined) {job.imageIds = updates.imageIds;}
    if (updates?.progress !== undefined) {job.progress = updates.progress;}

    if (status === 'completed' || status === 'error') {
      job.completedAt = new Date().toISOString();
      job.progress = status === 'completed' ? 100 : job.progress;
    }

    return job;
  }

  /**
   * Mark job as started
   */
  async startJob(jobId: string): Promise<ImageGenerationJob | null> {
    return this.updateJobStatus(jobId, 'generating', { progress: 10 });
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, imageIds: string[]): Promise<ImageGenerationJob | null> {
    return this.updateJobStatus(jobId, 'completed', { imageIds, progress: 100 });
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<ImageGenerationJob | null> {
    return this.updateJobStatus(jobId, 'error', { error });
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<ImageGenerationJob | null> {
    const job = this.jobs.get(jobId);
    if (!job) {return null;}

    job.progress = Math.max(0, Math.min(100, progress));
    job.updatedAt = new Date().toISOString();

    return job;
  }

  /**
   * Get pending jobs (for worker to pick up)
   */
  async getPendingJobs(limit = 10): Promise<ImageGenerationJob[]> {
    return Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .slice(0, limit);
  }

  /**
   * Get jobs by session ID
   */
  async getJobsBySession(sessionId: string): Promise<ImageGenerationJob[]> {
    return Array.from(this.jobs.values())
      .filter(job => job.request.sessionId === sessionId);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const jobs = Array.from(this.jobs.values());
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      generating: jobs.filter(j => j.status === 'generating').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'error').length,
      total: jobs.length,
    };
  }

  /**
   * Check if all jobs for a session are complete
   */
  async isSessionComplete(sessionId: string): Promise<{ complete: boolean; stats: { total: number; completed: number; failed: number } }> {
    const jobs = await this.getJobsBySession(sessionId);
    const stats = {
      total: jobs.length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'error').length,
    };
    const complete = jobs.every(j => j.status === 'completed' || j.status === 'error');
    return { complete, stats };
  }

  /**
   * Clear old completed jobs (cleanup)
   */
  async cleanupOldJobs(maxAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - maxAgeMs;
    let cleaned = 0;

    for (const [id, job] of this.jobs.entries()) {
      if (job.completedAt && new Date(job.completedAt).getTime() < cutoff) {
        this.jobs.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Clear all jobs (for testing)
   */
  async clear(): Promise<void> {
    this.jobs.clear();
  }
}

// Singleton instance
let _queueService: ImageGenerationQueueService | null = null;

export function getImageGenerationQueueService(): ImageGenerationQueueService {
  _queueService ??= new ImageGenerationQueueService();
  return _queueService;
}

export function resetImageGenerationQueueService(): void {
  _queueService = null;
}


