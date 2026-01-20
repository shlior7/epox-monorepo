import { and, desc, eq, lte, sql } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { generationJob, type JobStatus, type JobType, type ImageGenerationPayload, type ImageEditPayload, type VideoGenerationPayload, type JobResult } from '../schema/jobs';
import { BaseRepository } from './base';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerationJob {
  id: string;
  clientId: string;
  flowId: string | null;
  type: JobType;
  payload: ImageGenerationPayload | ImageEditPayload | VideoGenerationPayload;
  status: JobStatus;
  progress: number;
  result: JobResult | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
  lockedBy: string | null;
  lockedAt: Date | null;
  priority: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface GenerationJobCreate {
  clientId: string;
  flowId?: string;
  type: JobType;
  payload: ImageGenerationPayload | ImageEditPayload | VideoGenerationPayload;
  priority?: number;
  maxAttempts?: number;
}

export interface GenerationJobUpdate {
  status?: JobStatus;
  progress?: number;
  result?: JobResult;
  payload?: ImageGenerationPayload | ImageEditPayload | VideoGenerationPayload;
  error?: string | null;
  scheduledFor?: Date;
  lockedBy?: string | null;
  lockedAt?: Date | null;
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// REPOSITORY
// ============================================================================

export class GenerationJobRepository extends BaseRepository<GenerationJob> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, generationJob);
  }

  private mapClaimedRow(row: Record<string, unknown>): GenerationJob {
    if ('clientId' in row) {
      return row as unknown as GenerationJob;
    }

    return {
      id: row.id as string,
      clientId: row.client_id as string,
      flowId: row.flow_id as string | null,
      type: row.type as JobType,
      payload: row.payload as ImageGenerationPayload | ImageEditPayload | VideoGenerationPayload,
      status: row.status as JobStatus,
      progress: row.progress as number,
      result: row.result as JobResult | null,
      error: row.error as string | null,
      attempts: row.attempts as number,
      maxAttempts: row.max_attempts as number,
      scheduledFor: row.scheduled_for as Date,
      lockedBy: row.locked_by as string | null,
      lockedAt: row.locked_at as Date | null,
      priority: row.priority as number,
      createdAt: row.created_at as Date,
      startedAt: row.started_at as Date | null,
      completedAt: row.completed_at as Date | null,
    };
  }


  /**
   * Create a new job
   */
  async create(data: GenerationJobCreate): Promise<GenerationJob> {
    const id = `job_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
    const now = new Date();

    const [created] = await this.drizzle
      .insert(generationJob)
      .values({
        id,
        clientId: data.clientId,
        flowId: data.flowId ?? null,
        type: data.type,
        payload: data.payload,
        status: 'pending',
        progress: 0,
        priority: data.priority ?? 100,
        maxAttempts: data.maxAttempts ?? 3,
        scheduledFor: now,
        createdAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  /**
   * Claim a pending job atomically (FOR UPDATE SKIP LOCKED)
   */
  async claimJob(workerId: string): Promise<GenerationJob | null> {
    const result = await this.drizzle.execute(sql`
      UPDATE generation_job
      SET
        status = 'processing',
        locked_by = ${workerId},
        locked_at = NOW(),
        started_at = NOW(),
        attempts = CASE
          WHEN error IS NULL AND payload->>'operationName' IS NOT NULL THEN attempts
          ELSE attempts + 1
        END
      WHERE id = (
        SELECT id FROM generation_job
        WHERE status = 'pending'
          AND scheduled_for <= NOW()
        ORDER BY priority ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    `);

    const rows = result.rows as Array<Record<string, unknown>>;
    return rows[0] ? this.mapClaimedRow(rows[0]) : null;
  }

  /**
   * Update job status and progress
   */
  async updateStatus(id: string, data: GenerationJobUpdate): Promise<GenerationJob> {
    const [updated] = await this.drizzle
      .update(generationJob)
      .set(data)
      .where(eq(generationJob.id, id))
      .returning();

    return this.mapToEntity(updated);
  }

  /**
   * Mark job as completed
   */
  async complete(id: string, result: JobResult): Promise<GenerationJob> {
    return this.updateStatus(id, {
      status: 'completed',
      progress: 100,
      result,
      completedAt: new Date(),
      lockedBy: null,
      lockedAt: null,
    });
  }

  /**
   * Mark job as failed
   */
  async fail(id: string, error: string): Promise<GenerationJob> {
    return this.updateStatus(id, {
      status: 'failed',
      error,
      completedAt: new Date(),
      lockedBy: null,
      lockedAt: null,
    });
  }

  /**
   * Schedule job for retry with exponential backoff
   */
  async scheduleRetry(
    id: string,
    error: string,
    attempts: number,
    payload?: ImageGenerationPayload | ImageEditPayload | VideoGenerationPayload
  ): Promise<GenerationJob> {
    const delaySeconds = Math.pow(attempts, 2) * 10; // 10s, 40s, 90s, ...
    const scheduledFor = new Date(Date.now() + delaySeconds * 1000);

    const update: GenerationJobUpdate = {
      status: 'pending',
      error,
      scheduledFor,
      lockedBy: null,
      lockedAt: null,
    };

    if (payload) {
      update.payload = payload;
    }

    return this.updateStatus(id, update);
  }

  /**
   * Update job progress
   */
  async updateProgress(id: string, progress: number): Promise<void> {
    await this.drizzle
      .update(generationJob)
      .set({ progress: Math.min(100, Math.max(0, progress)) })
      .where(eq(generationJob.id, id));
  }

  /**
   * List jobs by client
   */
  async listByClient(clientId: string, limit = 100): Promise<GenerationJob[]> {
    const rows = await this.drizzle
      .select()
      .from(generationJob)
      .where(eq(generationJob.clientId, clientId))
      .orderBy(desc(generationJob.createdAt))
      .limit(limit);

    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * List jobs by flow
   */
  async listByFlow(flowId: string): Promise<GenerationJob[]> {
    const rows = await this.drizzle
      .select()
      .from(generationJob)
      .where(eq(generationJob.flowId, flowId))
      .orderBy(desc(generationJob.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * List jobs by status
   */
  async listByStatus(status: JobStatus, limit = 100): Promise<GenerationJob[]> {
    const rows = await this.drizzle
      .select()
      .from(generationJob)
      .where(eq(generationJob.status, status))
      .orderBy(desc(generationJob.createdAt))
      .limit(limit);

    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * Get pending jobs count
   */
  async getPendingCount(): Promise<number> {
    const result = await this.drizzle.execute(sql`
      SELECT COUNT(*) as count FROM generation_job WHERE status = 'pending'
    `);
    return parseInt((result.rows[0] as { count: string }).count, 10);
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const result = await this.drizzle.execute(sql`
      SELECT
        status,
        COUNT(*) as count
      FROM generation_job
      GROUP BY status
    `);

    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const row of result.rows as Array<{ status: JobStatus; count: string }>) {
      if (row.status in stats) {
        stats[row.status as keyof typeof stats] = parseInt(row.count, 10);
      }
    }
    return stats;
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(olderThanHours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const result = await this.drizzle
      .delete(generationJob)
      .where(
        and(
          sql`${generationJob.status} IN ('completed', 'failed')`,
          lte(generationJob.completedAt, cutoff)
        )
      )
      .returning({ id: generationJob.id });

    return result.length;
  }

  /**
   * Cancel a job
   */
  async cancel(id: string): Promise<GenerationJob> {
    return this.updateStatus(id, {
      status: 'cancelled',
      completedAt: new Date(),
      lockedBy: null,
      lockedAt: null,
    });
  }
}
