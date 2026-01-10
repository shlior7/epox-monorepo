import { and, desc, eq, inArray } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { generatedImage } from '../schema/generated-images';
import type { GeneratedImage, GeneratedImageCreate } from '../types';
import { BaseRepository } from './base';

type GeneratedImageInsert = GeneratedImageCreate & { id: string; createdAt?: Date; updatedAt?: Date };

export class GeneratedImageRepository extends BaseRepository<GeneratedImage> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, generatedImage);
  }

  async create(data: GeneratedImageCreate): Promise<GeneratedImage> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(generatedImage)
      .values({
        id,
        clientId: data.clientId,
        flowId: data.flowId ?? null,
        chatSessionId: data.chatSessionId ?? null,
        r2Key: data.r2Key,
        prompt: data.prompt ?? null,
        settings: data.settings ?? null,
        productIds: data.productIds ?? null,
        jobId: data.jobId ?? null,
        error: data.error ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async createBatchWithIds(entries: GeneratedImageInsert[]): Promise<GeneratedImage[]> {
    if (entries.length === 0) {
      return [];
    }

    const now = new Date();
    const rows = await this.drizzle
      .insert(generatedImage)
      .values(
        entries.map((entry) => ({
          id: entry.id,
          clientId: entry.clientId,
          flowId: entry.flowId ?? null,
          chatSessionId: entry.chatSessionId ?? null,
          r2Key: entry.r2Key,
          prompt: entry.prompt ?? null,
          settings: entry.settings ?? null,
          productIds: entry.productIds ?? null,
          jobId: entry.jobId ?? null,
          error: entry.error ?? null,
          createdAt: entry.createdAt ?? now,
          updatedAt: entry.updatedAt ?? now,
        }))
      )
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async list(clientId: string, options?: { flowId?: string; limit?: number }): Promise<GeneratedImage[]> {
    const conditions = [eq(generatedImage.clientId, clientId)];
    if (options?.flowId) {
      conditions.push(eq(generatedImage.flowId, options.flowId));
    }

    const rows = await this.drizzle
      .select()
      .from(generatedImage)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(generatedImage.createdAt))
      .limit(options?.limit ?? 100);

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByFlow(flowId: string): Promise<GeneratedImage[]> {
    const rows = await this.drizzle
      .select()
      .from(generatedImage)
      .where(eq(generatedImage.flowId, flowId))
      .orderBy(desc(generatedImage.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByFlowIds(flowIds: string[]): Promise<GeneratedImage[]> {
    if (flowIds.length === 0) {
      return [];
    }

    const rows = await this.drizzle
      .select()
      .from(generatedImage)
      .where(inArray(generatedImage.flowId, flowIds))
      .orderBy(desc(generatedImage.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async deleteByFlowIds(flowIds: string[]): Promise<void> {
    if (flowIds.length === 0) {
      return;
    }
    await this.drizzle.delete(generatedImage).where(inArray(generatedImage.flowId, flowIds));
  }
}
