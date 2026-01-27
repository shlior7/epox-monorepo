import { and, desc, asc, eq, inArray, isNull, isNotNull, lt, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { generatedAsset, generatedAssetProduct, favoriteImage } from '../schema/generated-images';
import { product } from '../schema/products';
import { storeSyncLog } from '../schema/store-sync';
import type {
  GeneratedAsset,
  GeneratedAssetCreate,
  GeneratedAssetUpdate,
  AssetStatus,
  ApprovalStatus,
  FlowGenerationSettings,
  ProductAssetGroup,
  GeneratedAssetWithSync,
  AssetSyncStatus,
} from 'visualizer-types';
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

  /**
   * Create a generated asset with a specific ID (useful for API routes that need to return the ID)
   */
  async createWithId(id: string, data: GeneratedAssetCreate): Promise<GeneratedAsset> {
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

  // Override to filter out soft-deleted records
  async getById(id: string): Promise<GeneratedAsset | null> {
    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(and(eq(generatedAsset.id, id), isNull(generatedAsset.deletedAt)))
      .limit(1);
    return rows[0] ? this.mapToEntity(rows[0]) : null;
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

  // ===== OPTIMIZED: GET STATS BY PRODUCT ID (single query) =====

  async getStatsByProductId(
    clientId: string,
    productId: string
  ): Promise<{ totalGenerated: number; pinnedCount: number; approvedCount: number; pendingCount: number }> {
    const result = await this.drizzle.execute(sql`
      SELECT
        COUNT(*)::int as total_generated,
        COUNT(*) FILTER (WHERE pinned = true)::int as pinned_count,
        COUNT(*) FILTER (WHERE approval_status = 'approved')::int as approved_count,
        COUNT(*) FILTER (WHERE approval_status = 'pending')::int as pending_count
      FROM ${generatedAsset}
      WHERE client_id = ${clientId}
        AND ${generatedAsset.productIds} @> ${JSON.stringify([productId])}::jsonb
        AND deleted_at IS NULL
    `);

    const row = (result.rows[0] ?? {}) as { total_generated: number; pinned_count: number; approved_count: number; pending_count: number };
    return {
      totalGenerated: row.total_generated ?? 0,
      pinnedCount: row.pinned_count ?? 0,
      approvedCount: row.approved_count ?? 0,
      pendingCount: row.pending_count ?? 0,
    };
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

  /**
   * Get asset count breakdown by status for multiple generation flows
   * Used to check if collection generation is complete
   */
  async getStatusCountsByFlowIds(
    flowIds: string[]
  ): Promise<{ total: number; completed: number; generating: number }> {
    if (flowIds.length === 0) {
      return { total: 0, completed: 0, generating: 0 };
    }

    const [result] = await this.drizzle
      .select({
        total: sql<number>`COUNT(*)::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${generatedAsset.status} = 'completed')::int`,
        generating: sql<number>`COUNT(*) FILTER (WHERE ${generatedAsset.status} IN ('pending', 'generating'))::int`,
      })
      .from(generatedAsset)
      .where(and(inArray(generatedAsset.generationFlowId, flowIds), isNull(generatedAsset.deletedAt)));

    return result ?? { total: 0, completed: 0, generating: 0 };
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

  // ===== HARD DELETE MANY (batch delete for parallel storage operations) =====

  async hardDeleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    // Delete product links first (foreign key constraint)
    await this.drizzle.delete(generatedAssetProduct).where(inArray(generatedAssetProduct.generatedAssetId, ids));

    // Delete the assets
    await this.drizzle.delete(generatedAsset).where(inArray(generatedAsset.id, ids));
  }

  // ===== LIST DELETABLE BY FLOW IDS (not pinned and not approved - SQL-level filtering) =====

  async listDeletableByFlowIds(flowIds: string[]): Promise<GeneratedAsset[]> {
    if (flowIds.length === 0) {
      return [];
    }

    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(
        and(
          inArray(generatedAsset.generationFlowId, flowIds),
          isNull(generatedAsset.deletedAt),
          eq(generatedAsset.pinned, false),
          sql`${generatedAsset.approvalStatus} != 'approved'`
        )
      );

    return rows.map((row) => this.mapToEntity(row));
  }

  // ===== OPTIMIZED: LIST BY FLOW WITH ALL FILTERS (SQL-level) =====

  async listByFlowWithFilters(
    generationFlowId: string,
    options: Omit<GeneratedAssetListOptions, 'flowId'> = {}
  ): Promise<GeneratedAsset[]> {
    const conditions: SQL[] = [eq(generatedAsset.generationFlowId, generationFlowId), isNull(generatedAsset.deletedAt)];

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

  async countByFlowWithFilters(
    generationFlowId: string,
    options: Omit<GeneratedAssetListOptions, 'flowId' | 'limit' | 'offset' | 'sort'> = {}
  ): Promise<number> {
    const conditions: SQL[] = [eq(generatedAsset.generationFlowId, generationFlowId), isNull(generatedAsset.deletedAt)];

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

    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(generatedAsset)
      .where(and(...conditions));

    return result.count;
  }

  // ===== OPTIMIZED: BULK STATS BY FLOW IDS (single query for N+1 elimination) =====

  async getStatsByFlowIds(
    clientId: string,
    flowIds: string[]
  ): Promise<Map<string, { totalImages: number; completedCount: number; thumbnailUrl: string | null }>> {
    if (flowIds.length === 0) {
      return new Map();
    }

    // Convert to PostgreSQL array literal
    const flowIdsArray = sql.raw(`ARRAY[${flowIds.map((id) => `'${id}'`).join(', ')}]::text[]`);

    // Single query with aggregation and first completed asset for thumbnail
    const rows = await this.drizzle.execute(sql`
      WITH flow_stats AS (
        SELECT
          generation_flow_id,
          COUNT(*)::int as total_images,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_count
        FROM ${generatedAsset}
        WHERE client_id = ${clientId}
          AND generation_flow_id = ANY(${flowIdsArray})
          AND deleted_at IS NULL
        GROUP BY generation_flow_id
      ),
      first_completed AS (
        SELECT DISTINCT ON (generation_flow_id)
          generation_flow_id,
          asset_url
        FROM ${generatedAsset}
        WHERE client_id = ${clientId}
          AND generation_flow_id = ANY(${flowIdsArray})
          AND deleted_at IS NULL
          AND status = 'completed'
        ORDER BY generation_flow_id, created_at DESC
      )
      SELECT
        fs.generation_flow_id as flow_id,
        COALESCE(fs.total_images, 0) as total_images,
        COALESCE(fs.completed_count, 0) as completed_count,
        fc.asset_url as thumbnail_url
      FROM flow_stats fs
      LEFT JOIN first_completed fc ON fs.generation_flow_id = fc.generation_flow_id
    `);

    const result = new Map<string, { totalImages: number; completedCount: number; thumbnailUrl: string | null }>();

    // Initialize all flow IDs with zero stats
    for (const flowId of flowIds) {
      result.set(flowId, { totalImages: 0, completedCount: 0, thumbnailUrl: null });
    }

    // Fill in actual stats
    for (const row of rows.rows as Array<{
      flow_id: string;
      total_images: number;
      completed_count: number;
      thumbnail_url: string | null;
    }>) {
      result.set(row.flow_id, {
        totalImages: row.total_images,
        completedCount: row.completed_count,
        thumbnailUrl: row.thumbnail_url,
      });
    }

    return result;
  }

  // ===== COMPLETE PENDING ASSET BY JOB ID =====

  /**
   * Find a pending asset for a job and mark it as completed.
   * Used by the worker to update placeholder assets created when generation starts.
   * @returns The asset ID if found and updated, or null if no pending asset exists
   */
  async completePendingByJobId(
    jobId: string,
    data: {
      assetUrl: string;
      prompt?: string;
      settings?: Record<string, unknown>;
    }
  ): Promise<string | null> {
    // Find pending asset for this job
    const rows = await this.drizzle
      .select()
      .from(generatedAsset)
      .where(and(eq(generatedAsset.jobId, jobId), eq(generatedAsset.status, 'pending')))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const existingAsset = rows[0];
    const now = new Date();

    // Update the placeholder to completed
    await this.drizzle
      .update(generatedAsset)
      .set({
        assetUrl: data.assetUrl,
        status: 'completed',
        prompt: data.prompt ?? null,
        settings: data.settings as FlowGenerationSettings | null | undefined,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(generatedAsset.id, existingAsset.id));

    return existingAsset.id;
  }

  // ===== LIST WITH SYNC STATUS (for Store page) =====

  /**
   * List assets grouped by product with sync status information
   * Includes latest sync log, favorite status, and product store mapping
   * Default sort: synced + favorited assets first, then newest
   */
  async listWithSyncStatus(clientId: string, storeConnectionId: string): Promise<ProductAssetGroup[]> {
    const result = await this.drizzle.execute(sql`
      WITH asset_sync_status AS (
        SELECT DISTINCT ON (ga.id)
          ga.*,
          p.id as product_id,
          p.name as product_name,
          p.store_id,
          p.store_url,
          p.store_product_name,
          ssl.status as sync_status,
          ssl.external_image_url,
          ssl.error_message as sync_error,
          ssl.completed_at as last_synced_at,
          CASE WHEN fi.id IS NOT NULL THEN true ELSE false END as is_favorite
        FROM ${generatedAsset} ga
        -- Extract first product ID from productIds JSONB array
        CROSS JOIN LATERAL (
          SELECT jsonb_array_elements_text(ga.product_ids) as product_id
          LIMIT 1
        ) AS first_product
        -- Join with product table
        LEFT JOIN ${product} p ON p.id = first_product.product_id AND p.client_id = ${clientId}
        -- Get latest sync log for this asset
        LEFT JOIN LATERAL (
          SELECT *
          FROM ${storeSyncLog}
          WHERE generated_asset_id = ga.id
            AND store_connection_id = ${storeConnectionId}
          ORDER BY started_at DESC
          LIMIT 1
        ) ssl ON true
        -- Check if favorited
        LEFT JOIN ${favoriteImage} fi ON fi.generated_asset_id = ga.id AND fi.client_id = ${clientId}
        WHERE ga.client_id = ${clientId}
          AND ga.deleted_at IS NULL
          AND p.id IS NOT NULL
      )
      SELECT
        product_id,
        product_name,
        store_id,
        store_url,
        store_product_name,
        json_agg(
          json_build_object(
            'id', id,
            'clientId', client_id,
            'generationFlowId', generation_flow_id,
            'chatSessionId', chat_session_id,
            'assetUrl', asset_url,
            'assetType', asset_type,
            'status', status,
            'prompt', prompt,
            'settings', settings,
            'productIds', product_ids,
            'jobId', job_id,
            'error', error,
            'assetAnalysis', asset_analysis,
            'analysisVersion', analysis_version,
            'approvalStatus', approval_status,
            'approvedAt', approved_at,
            'approvedBy', approved_by,
            'completedAt', completed_at,
            'pinned', pinned,
            'createdAt', created_at,
            'updatedAt', updated_at,
            'deletedAt', deleted_at,
            'syncStatus', COALESCE(sync_status, 'not_synced'),
            'lastSyncedAt', last_synced_at,
            'externalImageUrl', external_image_url,
            'syncError', sync_error,
            'isFavorite', is_favorite,
            'product', json_build_object(
              'id', product_id,
              'name', product_name,
              'storeId', store_id,
              'storeUrl', store_url,
              'storeName', store_product_name
            )
          )
          ORDER BY
            CASE WHEN sync_status = 'success' THEN 0 ELSE 1 END,
            CASE WHEN is_favorite = true THEN 0 ELSE 1 END,
            created_at DESC
        ) as assets,
        COUNT(*)::int as total_count,
        COUNT(*) FILTER (WHERE sync_status = 'success')::int as synced_count,
        COUNT(*) FILTER (WHERE is_favorite = true)::int as favorite_count
      FROM asset_sync_status
      GROUP BY product_id, product_name, store_id, store_url, store_product_name
      ORDER BY synced_count DESC, favorite_count DESC, product_name
    `);

    return (
      result.rows as Array<{
        product_id: string;
        product_name: string;
        store_id: string | null;
        store_url: string | null;
        store_product_name: string | null;
        assets: GeneratedAssetWithSync[];
        total_count: number;
        synced_count: number;
        favorite_count: number;
      }>
    ).map((row) => ({
      product: {
        id: row.product_id,
        name: row.product_name,
        // Note: Product type uses null, not undefined
        storeId: row.store_id,
        storeUrl: row.store_url,
        storeName: row.store_product_name,
        // Add minimal required Product fields (these won't be used by UI)
        clientId,
        description: null,
        category: null,
        sceneTypes: null,
        selectedSceneType: null,
        modelFilename: null,
        isFavorite: false,
        source: 'uploaded' as const,
        storeConnectionId: null,
        storeSku: null,
        importedAt: null,
        analysisData: null,
        analysisVersion: null,
        analyzedAt: null,
        price: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 0,
      },
      assets: row.assets.map((asset) => ({
        ...asset,
        syncStatus: (asset.syncStatus ?? 'not_synced') as AssetSyncStatus,
        createdAt: new Date(asset.createdAt),
        updatedAt: new Date(asset.updatedAt),
        completedAt: asset.completedAt ? new Date(asset.completedAt) : null,
        approvedAt: asset.approvedAt ? new Date(asset.approvedAt) : null,
        lastSyncedAt: asset.lastSyncedAt ? new Date(asset.lastSyncedAt) : undefined,
        deletedAt: asset.deletedAt ? new Date(asset.deletedAt) : null,
      })),
      totalCount: row.total_count,
      syncedCount: row.synced_count,
      favoriteCount: row.favorite_count,
    }));
  }

  // ===== PRODUCT LINKING =====

  /**
   * Link a product to a generated asset via junction table
   * Used when creating new assets that should be associated with products
   */
  async linkProductToAsset(assetId: string, productId: string, isPrimary = true): Promise<void> {
    const id = `gap_${assetId}_${productId}`;
    await this.drizzle.insert(generatedAssetProduct).values({
      id,
      generatedAssetId: assetId,
      productId,
      isPrimary,
      createdAt: new Date(),
    });
  }

  /**
   * Link multiple products to a generated asset
   */
  async linkProductsToAsset(assetId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) {
      return;
    }

    const now = new Date();
    await this.drizzle.insert(generatedAssetProduct).values(
      productIds.map((productId, index) => ({
        id: `gap_${assetId}_${productId}`,
        generatedAssetId: assetId,
        productId,
        isPrimary: index === 0, // First product is primary
        createdAt: now,
      }))
    );
  }
}
