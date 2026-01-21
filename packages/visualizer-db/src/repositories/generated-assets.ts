import { and, desc, asc, eq, inArray, isNull, isNotNull, lt, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { generatedAsset, generatedAssetProduct } from '../schema/generated-images';
import type { GeneratedAsset, GeneratedAssetCreate, GeneratedAssetUpdate, AssetStatus, ApprovalStatus } from 'visualizer-types';
import { NotFoundError } from '../errors';
import { BaseRepository } from './base';

export interface GeneratedAssetListOptions {
  /** Filter by generation flow ID */
  flowId?: string;
  productId?: string;
  productIds?: string[];
  pinned?: boolean;
  status?: AssetStatus;
  approvalStatus?: ApprovalStatus;
  sort?: 'date' | 'oldest';
  limit?: number;
  offset?: number;
}

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
        pinned: data.pinned ?? false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
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
          pinned: entry.pinned ?? false,
          createdAt: entry.createdAt ?? now,
          updatedAt: entry.updatedAt ?? now,
          deletedAt: null,
        }))
      )
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async list(
    clientId: string,
    options?: { generationFlowId?: string; limit?: number; includeDeleted?: boolean }
  ): Promise<GeneratedAsset[]> {
    const conditions = [eq(generatedAsset.clientId, clientId)];
    if (options?.generationFlowId) {
      conditions.push(eq(generatedAsset.generationFlowId, options.generationFlowId));
    }
    if (!options?.includeDeleted) {
      conditions.push(isNull(generatedAsset.deletedAt));
    }

    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(generatedAsset.createdAt))
      .limit(options?.limit ?? 100);

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByGenerationFlow(generationFlowId: string, includeDeleted = false): Promise<GeneratedAsset[]> {
    const conditions = [eq(generatedAsset.generationFlowId, generationFlowId)];
    if (!includeDeleted) {
      conditions.push(isNull(generatedAsset.deletedAt));
    }

    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(and(...conditions))
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
    const result = await this.drizzle
      .update(generatedAsset)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(generatedAsset.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('generated_asset', id);
    }
    return this.mapToEntity(result[0]);
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

  // ===== SOFT DELETE =====

  async softDelete(id: string): Promise<GeneratedAsset> {
    const now = new Date();
    const result = await this.drizzle
      .update(generatedAsset)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(generatedAsset.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('generated_asset', id);
    }
    return this.mapToEntity(result[0]);
  }

  async restore(id: string): Promise<GeneratedAsset> {
    const result = await this.drizzle
      .update(generatedAsset)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(generatedAsset.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('generated_asset', id);
    }
    return this.mapToEntity(result[0]);
  }

  async listDeleted(clientId: string, limit = 100): Promise<GeneratedAsset[]> {
    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(and(eq(generatedAsset.clientId, clientId), isNotNull(generatedAsset.deletedAt)))
      .orderBy(desc(generatedAsset.deletedAt))
      .limit(limit);

    return rows.map((row) => this.mapToEntity(row));
  }

  async permanentDeleteOld(daysOld = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = await this.drizzle
      .delete(generatedAsset)
      .where(and(isNotNull(generatedAsset.deletedAt), lt(generatedAsset.deletedAt, cutoff)))
      .returning();

    return result.length;
  }

  // ===== PIN/UNPIN =====

  async togglePin(id: string): Promise<GeneratedAsset> {
    const current = await this.requireById(id);
    const [updated] = await this.drizzle
      .update(generatedAsset)
      .set({
        pinned: !current.pinned,
        updatedAt: new Date(),
      })
      .where(eq(generatedAsset.id, id))
      .returning();

    return this.mapToEntity(updated);
  }

  async pin(id: string): Promise<GeneratedAsset> {
    const result = await this.drizzle
      .update(generatedAsset)
      .set({
        pinned: true,
        updatedAt: new Date(),
      })
      .where(eq(generatedAsset.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('generated_asset', id);
    }
    return this.mapToEntity(result[0]);
  }

  async unpin(id: string): Promise<GeneratedAsset> {
    const result = await this.drizzle
      .update(generatedAsset)
      .set({
        pinned: false,
        updatedAt: new Date(),
      })
      .where(eq(generatedAsset.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('generated_asset', id);
    }
    return this.mapToEntity(result[0]);
  }

  async listPinned(clientId: string): Promise<GeneratedAsset[]> {
    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(and(eq(generatedAsset.clientId, clientId), eq(generatedAsset.pinned, true), isNull(generatedAsset.deletedAt)))
      .orderBy(desc(generatedAsset.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  // ===== FIND BY JOB ID =====

  async findByJobId(clientId: string, jobId: string): Promise<GeneratedAsset[]> {
    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(and(eq(generatedAsset.clientId, clientId), eq(generatedAsset.jobId, jobId), isNull(generatedAsset.deletedAt)))
      .orderBy(desc(generatedAsset.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  // ===== LIST WITH FILTERS =====

  async listWithFilters(clientId: string, options: GeneratedAssetListOptions = {}): Promise<GeneratedAsset[]> {
    const conditions = this.buildFilterConditions(clientId, options);
    const orderByClause = options.sort === 'oldest' ? asc(generatedAsset.createdAt) : desc(generatedAsset.createdAt);

    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(options.limit ?? 100)
      .offset(options.offset ?? 0);

    return rows.map((row) => this.mapToEntity(row));
  }

  async countWithFilters(clientId: string, options: Omit<GeneratedAssetListOptions, 'limit' | 'offset' | 'sort'> = {}): Promise<number> {
    const conditions = this.buildFilterConditions(clientId, options);

    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(generatedAsset)
      .where(and(...conditions));

    return result.count;
  }

  private buildFilterConditions(clientId: string, options: Omit<GeneratedAssetListOptions, 'limit' | 'offset' | 'sort'>): SQL[] {
    const conditions: SQL[] = [eq(generatedAsset.clientId, clientId), isNull(generatedAsset.deletedAt)];

    if (options.flowId) {
      conditions.push(eq(generatedAsset.generationFlowId, options.flowId));
    }

    if (options.productId) {
      conditions.push(sql`${generatedAsset.productIds} @> ${JSON.stringify([options.productId])}::jsonb`);
    }

    if (options.productIds && options.productIds.length > 0) {
      const arrayLiteral = `array[${options.productIds.map((id) => `'${id.replaceAll("'", "''")}'`).join(', ')}]`;
      conditions.push(sql`${generatedAsset.productIds} ?| ${sql.raw(arrayLiteral)}`);
    }

    if (options.pinned !== undefined) {
      conditions.push(eq(generatedAsset.pinned, options.pinned));
    }

    if (options.status) {
      conditions.push(eq(generatedAsset.status, options.status));
    }

    if (options.approvalStatus) {
      conditions.push(eq(generatedAsset.approvalStatus, options.approvalStatus));
    }

    return conditions;
  }

  // ===== LIST BY PRODUCT ID =====

  async listByProductId(clientId: string, productId: string, limit = 100): Promise<GeneratedAsset[]> {
    return this.listWithFilters(clientId, { productId, limit });
  }

  // ===== COUNT BY STATUS =====

  async countByStatus(clientId: string, status: AssetStatus): Promise<number> {
    return this.countWithFilters(clientId, { status });
  }

  // ===== COUNT BY PRODUCT IDS (for dashboard) =====

  async countByProductIds(clientId: string, productIds: string[], status?: AssetStatus): Promise<number> {
    if (productIds.length === 0) {
      return 0;
    }

    const arrayLiteral = `array[${productIds.map((id) => `'${id.replaceAll("'", "''")}'`).join(', ')}]`;
    const conditions: SQL[] = [
      eq(generatedAsset.clientId, clientId),
      isNull(generatedAsset.deletedAt),
      sql`${generatedAsset.productIds} ?| ${sql.raw(arrayLiteral)}`,
    ];

    if (status) {
      conditions.push(eq(generatedAsset.status, status));
    }

    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(generatedAsset)
      .where(and(...conditions));

    return result.count;
  }

  // ===== COUNT BY GENERATION FLOW IDS =====

  async countByGenerationFlowIds(clientId: string, generationFlowIds: string[], status?: AssetStatus): Promise<number> {
    if (generationFlowIds.length === 0) {
      return 0;
    }

    const conditions: SQL[] = [
      eq(generatedAsset.clientId, clientId),
      isNull(generatedAsset.deletedAt),
      inArray(generatedAsset.generationFlowId, generationFlowIds),
    ];

    if (status) {
      conditions.push(eq(generatedAsset.status, status));
    }

    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(generatedAsset)
      .where(and(...conditions));

    return result.count;
  }

  async getFirstByGenerationFlowIds(clientId: string, generationFlowIds: string[], status?: AssetStatus): Promise<GeneratedAsset | null> {
    if (generationFlowIds.length === 0) {
      return null;
    }

    const conditions: SQL[] = [
      eq(generatedAsset.clientId, clientId),
      isNull(generatedAsset.deletedAt),
      inArray(generatedAsset.generationFlowId, generationFlowIds),
    ];

    if (status) {
      conditions.push(eq(generatedAsset.status, status));
    }

    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(and(...conditions))
      .orderBy(desc(generatedAsset.createdAt))
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  // ===== GET FIRST BY PRODUCT IDS (for thumbnails) =====

  async getFirstByProductIds(clientId: string, productIds: string[], status?: AssetStatus): Promise<GeneratedAsset | null> {
    if (productIds.length === 0) {
      return null;
    }

    const arrayLiteral = `array[${productIds.map((id) => `'${id.replaceAll("'", "''")}'`).join(', ')}]`;
    const conditions: SQL[] = [
      eq(generatedAsset.clientId, clientId),
      isNull(generatedAsset.deletedAt),
      sql`${generatedAsset.productIds} ?| ${sql.raw(arrayLiteral)}`,
    ];

    if (status) {
      conditions.push(eq(generatedAsset.status, status));
    }

    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(and(...conditions))
      .orderBy(desc(generatedAsset.createdAt))
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  /**
   * Get distinct scene types for a client's assets (for filter dropdown)
   */
  async getDistinctSceneTypes(
    clientId: string,
    options?: Pick<GeneratedAssetListOptions, 'flowId' | 'productId' | 'productIds' | 'status'>
  ): Promise<string[]> {
    const conditions: SQL[] = [eq(generatedAsset.clientId, clientId), isNull(generatedAsset.deletedAt)];

    if (options?.flowId) {
      conditions.push(eq(generatedAsset.generationFlowId, options.flowId));
    }

    if (options?.productId) {
      // productIds is a JSONB column, use jsonb containment operator with proper jsonb cast
      conditions.push(sql`${generatedAsset.productIds} @> ${JSON.stringify([options.productId])}::jsonb`);
    }

    if (options?.productIds && options.productIds.length > 0) {
      const arrayLiteral = `array[${options.productIds.map((id) => `'${id.replaceAll("'", "''")}'`).join(', ')}]`;
      conditions.push(sql`${generatedAsset.productIds} ?| ${sql.raw(arrayLiteral)}`);
    }

    if (options?.status) {
      conditions.push(eq(generatedAsset.status, options.status));
    }

    // Query to extract distinct scene types from settings JSONB
    // Uses jsonb_typeof guard to ensure sceneType is an array before expanding
    const result = await this.drizzle.execute(sql`
      SELECT DISTINCT jsonb_array_elements_text(
        (settings->'promptTags'->'sceneType')
      ) as scene_type
      FROM ${generatedAsset}
      WHERE ${and(...conditions)}
        AND settings->'promptTags'->'sceneType' IS NOT NULL
        AND jsonb_typeof(settings->'promptTags'->'sceneType') = 'array'
      ORDER BY scene_type
    `);

    return (result.rows as Array<{ scene_type: string }>)
      .map((row) => row.scene_type)
      .filter((sceneType) => sceneType && sceneType.trim().length > 0);
  }

  // ===== HARD DELETE (with product links) =====

  async hardDelete(id: string): Promise<void> {
    // Delete product links first (foreign key constraint)
    await this.drizzle.delete(generatedAssetProduct).where(eq(generatedAssetProduct.generatedAssetId, id));

    // Delete the asset
    await this.delete(id);
  }
}
