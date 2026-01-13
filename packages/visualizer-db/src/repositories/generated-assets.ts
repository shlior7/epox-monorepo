import { and, desc, eq, inArray } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { generatedAsset } from '../schema/generated-images';
import type { GeneratedAsset, GeneratedAssetCreate, GeneratedAssetUpdate } from 'visualizer-types';
import { NotFoundError } from '../errors';
import { BaseRepository } from './base';

type GeneratedAssetInsert = GeneratedAssetCreate & { id: string; createdAt?: Date; updatedAt?: Date };

export class GeneratedAssetRepository extends BaseRepository<GeneratedAsset> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, generatedAsset);
  }

  async create(data: GeneratedAssetCreate): Promise<GeneratedAsset> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(generatedAsset)
      .values({
        id,
        clientId: data.clientId,
        generationFlowId: data.generationFlowId ?? null,
        chatSessionId: data.chatSessionId ?? null,
        assetUrl: data.assetUrl,
        assetType: data.assetType ?? 'image',
        status: data.status ?? 'pending',
        prompt: data.prompt ?? null,
        settings: data.settings ?? null,
        productIds: data.productIds ?? null,
        jobId: data.jobId ?? null,
        error: data.error ?? null,
        assetAnalysis: data.assetAnalysis ?? null,
        analysisVersion: data.analysisVersion ?? null,
        approvalStatus: data.approvalStatus ?? 'pending',
        approvedAt: data.approvedAt ?? null,
        approvedBy: data.approvedBy ?? null,
        completedAt: data.completedAt ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async createBatchWithIds(entries: GeneratedAssetInsert[]): Promise<GeneratedAsset[]> {
    if (entries.length === 0) {
      return [];
    }

    const now = new Date();
    const rows = await this.drizzle
      .insert(generatedAsset)
      .values(
        entries.map((entry) => ({
          id: entry.id,
          clientId: entry.clientId,
          generationFlowId: entry.generationFlowId ?? null,
          chatSessionId: entry.chatSessionId ?? null,
          assetUrl: entry.assetUrl,
          assetType: entry.assetType ?? 'image',
          status: entry.status ?? 'pending',
          prompt: entry.prompt ?? null,
          settings: entry.settings ?? null,
          productIds: entry.productIds ?? null,
          jobId: entry.jobId ?? null,
          error: entry.error ?? null,
          assetAnalysis: entry.assetAnalysis ?? null,
          analysisVersion: entry.analysisVersion ?? null,
          approvalStatus: entry.approvalStatus ?? 'pending',
          approvedAt: entry.approvedAt ?? null,
          approvedBy: entry.approvedBy ?? null,
          completedAt: entry.completedAt ?? null,
          createdAt: entry.createdAt ?? now,
          updatedAt: entry.updatedAt ?? now,
        }))
      )
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async list(clientId: string, options?: { generationFlowId?: string; limit?: number }): Promise<GeneratedAsset[]> {
    const conditions = [eq(generatedAsset.clientId, clientId)];
    if (options?.generationFlowId) {
      conditions.push(eq(generatedAsset.generationFlowId, options.generationFlowId));
    }

    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(generatedAsset.createdAt))
      .limit(options?.limit ?? 100);

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByGenerationFlow(generationFlowId: string): Promise<GeneratedAsset[]> {
    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(eq(generatedAsset.generationFlowId, generationFlowId))
      .orderBy(desc(generatedAsset.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByGenerationFlowIds(generationFlowIds: string[]): Promise<GeneratedAsset[]> {
    if (generationFlowIds.length === 0) {
      return [];
    }

    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(inArray(generatedAsset.generationFlowId, generationFlowIds))
      .orderBy(desc(generatedAsset.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async deleteByGenerationFlowIds(generationFlowIds: string[]): Promise<void> {
    if (generationFlowIds.length === 0) {
      return;
    }
    await this.drizzle.delete(generatedAsset).where(inArray(generatedAsset.generationFlowId, generationFlowIds));
  }

  async update(id: string, data: GeneratedAssetUpdate): Promise<GeneratedAsset> {
    const [updated] = await this.drizzle
      .update(generatedAsset)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(generatedAsset.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError('generated_asset', id);
    }

    return this.mapToEntity(updated);
  }

  async approve(id: string, userId: string): Promise<GeneratedAsset> {
    const now = new Date();
    const [updated] = await this.drizzle
      .update(generatedAsset)
      .set({
        approvalStatus: 'approved',
        approvedAt: now,
        approvedBy: userId,
        updatedAt: now,
      })
      .where(eq(generatedAsset.id, id))
      .returning();

    return this.mapToEntity(updated);
  }

  async reject(id: string, userId: string): Promise<GeneratedAsset> {
    const now = new Date();
    const [updated] = await this.drizzle
      .update(generatedAsset)
      .set({
        approvalStatus: 'rejected',
        approvedAt: now,
        approvedBy: userId,
        updatedAt: now,
      })
      .where(eq(generatedAsset.id, id))
      .returning();

    return this.mapToEntity(updated);
  }
}
