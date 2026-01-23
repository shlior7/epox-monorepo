import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../../client';
import { antonClaudeTask } from '../../schema/anton';
import type { ClaudeTaskContext } from '../../schema/anton';
import { BaseRepository } from '../base';

export interface AntonClaudeTask {
  id: string;
  annotationId: string;
  projectId: string;
  claudeTaskId: string | null;
  prompt: string;
  context: ClaudeTaskContext;
  status: 'sent' | 'in_progress' | 'completed' | 'failed';
  response: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AntonClaudeTaskCreate {
  annotationId: string;
  projectId: string;
  claudeTaskId?: string;
  prompt: string;
  context: ClaudeTaskContext;
  status?: 'sent' | 'in_progress' | 'completed' | 'failed';
}

export interface AntonClaudeTaskUpdate {
  claudeTaskId?: string;
  status?: 'sent' | 'in_progress' | 'completed' | 'failed';
  response?: string;
  errorMessage?: string;
}

export class AntonClaudeTaskRepository extends BaseRepository<AntonClaudeTask> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, antonClaudeTask);
  }

  async create(data: AntonClaudeTaskCreate): Promise<AntonClaudeTask> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(antonClaudeTask)
      .values({
        id,
        annotationId: data.annotationId,
        projectId: data.projectId,
        claudeTaskId: data.claudeTaskId ?? null,
        prompt: data.prompt,
        context: data.context,
        status: data.status ?? 'sent',
        response: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async listByAnnotationId(annotationId: string): Promise<AntonClaudeTask[]> {
    const rows = await this.drizzle.select().from(antonClaudeTask).where(eq(antonClaudeTask.annotationId, annotationId));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByProjectId(projectId: string, status?: 'sent' | 'in_progress' | 'completed' | 'failed'): Promise<AntonClaudeTask[]> {
    const conditions: SQL[] = [eq(antonClaudeTask.projectId, projectId)];

    if (status) {
      conditions.push(eq(antonClaudeTask.status, status));
    }

    const rows = await this.drizzle.select().from(antonClaudeTask).where(and(...conditions));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getByClaudeTaskId(claudeTaskId: string): Promise<AntonClaudeTask | null> {
    const [row] = await this.drizzle
      .select()
      .from(antonClaudeTask)
      .where(eq(antonClaudeTask.claudeTaskId, claudeTaskId))
      .limit(1);

    return row ? this.mapToEntity(row) : null;
  }

  async update(id: string, data: AntonClaudeTaskUpdate): Promise<AntonClaudeTask> {
    const now = new Date();

    const [updated] = await this.drizzle
      .update(antonClaudeTask)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(antonClaudeTask.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Claude task not found: ${id}`);
    }

    return this.mapToEntity(updated);
  }

  async count(projectId: string, status?: 'sent' | 'in_progress' | 'completed' | 'failed'): Promise<number> {
    const conditions: SQL[] = [eq(antonClaudeTask.projectId, projectId)];

    if (status) {
      conditions.push(eq(antonClaudeTask.status, status));
    }

    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(antonClaudeTask)
      .where(and(...conditions));

    return result.count;
  }
}
