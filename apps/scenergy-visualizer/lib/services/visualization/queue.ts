import { VisualizationService } from './service';
import type { VisualizationRequest, GenerationSession } from '../shared/types';
import { redis } from '../redis/client';

type JobStatus = 'pending' | 'generating' | 'completed' | 'error';

interface VisualizationJob {
  id: string;
  request: VisualizationRequest;
  status: JobStatus;
  session: GenerationSession | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const generateJobId = () => `viz_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

export class VisualizationQueue {
  private readonly service: VisualizationService;
  private readonly REDIS_PREFIX = 'viz:job:';
  private readonly JOB_TTL = 86400; // 24 hours in seconds

  constructor(service: VisualizationService) {
    this.service = service;
  }

  private getJobKey(jobId: string): string {
    return `${this.REDIS_PREFIX}${jobId}`;
  }

  async enqueue(request: VisualizationRequest) {
    const jobId = generateJobId();
    const now = new Date().toISOString();
    const job: VisualizationJob = {
      id: jobId,
      request,
      status: 'pending',
      session: null,
      error: null,
      createdAt: now,
      updatedAt: now
    };

    // Save job to Redis with TTL
    await redis.set(this.getJobKey(jobId), JSON.stringify(job), { ex: this.JOB_TTL });

    // Start processing in background
    this.start(jobId).catch((error) => {
      console.error('Visualization job failed to start:', error);
    });

    return { jobId };
  }

  async get(jobId: string): Promise<VisualizationJob | null> {
    const jobData = await redis.get<string>(this.getJobKey(jobId));
    if (!jobData) return null;

    return JSON.parse(jobData);
  }

  async list(): Promise<VisualizationJob[]> {
    // Use SCAN instead of KEYS to avoid blocking Redis in production
    const jobs: VisualizationJob[] = [];
    let cursor: string | number = 0;

    do {
      const result: [string | number, string[]] = await redis.scan(cursor, {
        match: `${this.REDIS_PREFIX}*`,
        count: 100
      });

      cursor = result[0];
      const keys = result[1];

      // Fetch all jobs for this batch using mget for better performance
      if (keys.length > 0) {
        const jobDataList = await redis.mget<string[]>(...keys);
        for (const jobData of jobDataList) {
          if (jobData) {
            jobs.push(JSON.parse(jobData));
          }
        }
      }
    } while (cursor !== 0 && cursor !== '0');

    return jobs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  private async updateJob(jobId: string, updates: Partial<VisualizationJob>): Promise<void> {
    const job = await this.get(jobId);
    if (!job) return;

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await redis.set(this.getJobKey(jobId), JSON.stringify(updatedJob), { ex: this.JOB_TTL });
  }

  private async start(jobId: string) {
    const job = await this.get(jobId);
    if (!job) return;

    // Update status to generating
    await this.updateJob(jobId, { status: 'generating' });

    try {
      const session = await this.service.generateVisualization(job.request);
      await this.updateJob(jobId, {
        session,
        status: 'completed'
      });
    } catch (error) {
      await this.updateJob(jobId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Generation failed'
      });
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __scenergy_visualization_queue: VisualizationQueue | undefined;
}

const globalForQueue = globalThis as unknown as { __scenergy_visualization_queue?: VisualizationQueue };

export const visualizationQueue =
  globalForQueue.__scenergy_visualization_queue ?? new VisualizationQueue(new VisualizationService());

if (!globalForQueue.__scenergy_visualization_queue) {
  globalForQueue.__scenergy_visualization_queue = visualizationQueue;
}

export type { VisualizationJob };
