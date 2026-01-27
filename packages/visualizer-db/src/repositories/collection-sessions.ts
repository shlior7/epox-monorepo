import { and, asc, desc, eq, ilike, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { collectionSession, generationFlow, message } from '../schema/sessions';
import { generatedAsset, favoriteImage } from '../schema/generated-images';
import { productImage } from '../schema/products';
import type {
  CollectionSession,
  CollectionSessionCreate,
  CollectionSessionUpdate,
  CollectionSessionWithFlows,
  CollectionSessionStatus,
  GenerationFlow,
  Message,
} from 'visualizer-types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

export interface CollectionSessionListOptions {
  search?: string;
  status?: CollectionSessionStatus | 'all';
  sort?: 'recent' | 'name' | 'productCount';
  limit?: number;
  offset?: number;
}

export class CollectionSessionRepository extends BaseRepository<CollectionSession> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, collectionSession);
  }

  async create(clientId: string, data: CollectionSessionCreate): Promise<CollectionSession> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(collectionSession)
      .values({
        id,
        clientId,
        name: data.name,
        status: data.status ?? 'draft',
        productIds: data.productIds ?? [],
        selectedBaseImages: data.selectedBaseImages ?? {},
        settings: data.settings ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async upsertWithId(
    id: string,
    clientId: string,
    data: CollectionSessionCreate & { createdAt?: Date; updatedAt?: Date }
  ): Promise<CollectionSession> {
    const existing = await this.getById(id);
    const now = new Date();

    if (!existing) {
      const [created] = await this.drizzle
        .insert(collectionSession)
        .values({
          id,
          clientId,
          name: data.name,
          status: data.status ?? 'draft',
          productIds: data.productIds ?? [],
          selectedBaseImages: data.selectedBaseImages ?? {},
          settings: data.settings ?? null,
          version: 1,
          createdAt: data.createdAt ?? now,
          updatedAt: data.updatedAt ?? now,
        })
        .returning();

      return this.mapToEntity(created);
    }

    const [updated] = await this.drizzle
      .update(collectionSession)
      .set({
        name: data.name,
        status: data.status ?? existing.status,
        productIds: data.productIds ?? [],
        selectedBaseImages: data.selectedBaseImages ?? {},
        settings: data.settings ?? existing.settings,
        updatedAt: data.updatedAt ?? now,
        version: existing.version + 1,
      })
      .where(eq(collectionSession.id, id))
      .returning();

    return this.mapToEntity(updated);
  }

  async list(clientId: string): Promise<CollectionSession[]> {
    const rows = await this.drizzle
      .select()
      .from(collectionSession)
      .where(eq(collectionSession.clientId, clientId))
      .orderBy(asc(collectionSession.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getWithFlows(id: string): Promise<CollectionSessionWithFlows | null> {
    const session = await this.getById(id);
    if (!session) {
      return null;
    }

    const flows = await this.drizzle
      .select()
      .from(generationFlow)
      .where(eq(generationFlow.collectionSessionId, id))
      .orderBy(asc(generationFlow.createdAt));

    const messages = await this.drizzle.select().from(message).where(eq(message.collectionSessionId, id)).orderBy(asc(message.createdAt));

    return {
      ...session,
      generationFlows: flows as GenerationFlow[],
      messages: messages as Message[],
    };
  }

  async update(id: string, data: CollectionSessionUpdate, expectedVersion?: number): Promise<CollectionSession> {
    return updateWithVersion<CollectionSession>(this.drizzle, collectionSession, id, data, expectedVersion);
  }

  // ===== LIST WITH FILTERS =====

  async listWithFilters(clientId: string, options: CollectionSessionListOptions = {}): Promise<CollectionSession[]> {
    const conditions = this.buildFilterConditions(clientId, options);
    const orderByClause = this.getOrderByClause(options.sort);

    const rows = await this.drizzle
      .select()
      .from(collectionSession)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(options.limit ?? 100)
      .offset(options.offset ?? 0);

    return rows.map((row) => this.mapToEntity(row));
  }

  async countWithFilters(clientId: string, options: Omit<CollectionSessionListOptions, 'limit' | 'offset' | 'sort'> = {}): Promise<number> {
    const conditions = this.buildFilterConditions(clientId, options);

    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionSession)
      .where(and(...conditions));

    return result?.count ?? 0;
  }

  private buildFilterConditions(clientId: string, options: Omit<CollectionSessionListOptions, 'limit' | 'offset' | 'sort'>): SQL[] {
    const conditions: SQL[] = [eq(collectionSession.clientId, clientId)];

    if (options.search) {
      conditions.push(ilike(collectionSession.name, `%${options.search}%`));
    }

    if (options.status && options.status !== 'all') {
      conditions.push(eq(collectionSession.status, options.status));
    }

    return conditions;
  }

  private getOrderByClause(sort?: string) {
    switch (sort) {
      case 'name':
        return asc(collectionSession.name);
      case 'productCount':
        return desc(sql`jsonb_array_length(${collectionSession.productIds})`);
      case 'recent':
      default:
        return desc(collectionSession.updatedAt);
    }
  }

  // ===== LIST BY PRODUCT ID =====

  async listByProductId(clientId: string, productId: string, limit = 20): Promise<CollectionSession[]> {
    const rows = await this.drizzle
      .select()
      .from(collectionSession)
      .where(and(eq(collectionSession.clientId, clientId), sql`${collectionSession.productIds} @> ${JSON.stringify([productId])}::jsonb`))
      .orderBy(desc(collectionSession.updatedAt))
      .limit(limit);

    return rows.map((row) => this.mapToEntity(row));
  }

  // ===== LIST RECENT =====

  async listRecent(clientId: string, limit = 3): Promise<CollectionSession[]> {
    const rows = await this.drizzle
      .select()
      .from(collectionSession)
      .where(eq(collectionSession.clientId, clientId))
      .orderBy(desc(collectionSession.updatedAt))
      .limit(limit);

    return rows.map((row) => this.mapToEntity(row));
  }

  // ===== COUNT =====

  async count(clientId: string): Promise<number> {
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionSession)
      .where(eq(collectionSession.clientId, clientId));

    return result?.count ?? 0;
  }

  // ===== OPTIMIZED: LIST WITH ASSET STATS (single query for N+1 elimination) =====

  async listWithAssetStats(
    clientId: string,
    options: CollectionSessionListOptions = {}
  ): Promise<
    Array<CollectionSession & { totalImages: number; completedCount: number; generatingCount: number; thumbnails: string[] }>
  > {

    // Single query with JOINs and aggregation
    const rows = await this.drizzle.execute(sql`
      WITH collection_flows AS (
        SELECT
          cs.id as collection_id,
          COALESCE(array_agg(gf.id) FILTER (WHERE gf.id IS NOT NULL), '{}') as flow_ids
        FROM ${collectionSession} cs
        LEFT JOIN ${generationFlow} gf ON gf.collection_session_id = cs.id
        WHERE cs.client_id = ${clientId}
          ${options.search ? sql`AND cs.name ILIKE ${`%${options.search}%`}` : sql``}
          ${options.status && options.status !== 'all' ? sql`AND cs.status = ${options.status}` : sql``}
        GROUP BY cs.id
      ),
      asset_stats AS (
        SELECT
          cf.collection_id,
          COUNT(ga.id)::int as total_images,
          COUNT(ga.id) FILTER (WHERE ga.status = 'completed')::int as completed_count,
          COUNT(ga.id) FILTER (WHERE ga.status IN ('pending', 'generating'))::int as generating_count
        FROM collection_flows cf
        LEFT JOIN generated_asset ga ON ga.generation_flow_id = ANY(cf.flow_ids) AND ga.deleted_at IS NULL
        GROUP BY cf.collection_id
      ),
      collection_thumbnails AS (
        -- Get up to 4 thumbnails: prioritize generated assets, then product base images
        SELECT
          collection_id,
          array_agg(thumbnail_url) as thumbnails
        FROM (
          SELECT
            collection_id,
            thumbnail_url,
            row_number() OVER (PARTITION BY collection_id ORDER BY priority, created_at DESC) as rn
          FROM (
            -- Priority 1: Synced assets
            SELECT
              cf.collection_id,
              ga.asset_url as thumbnail_url,
              1 as priority,
              ga.created_at
            FROM collection_flows cf
            INNER JOIN generated_asset ga ON ga.generation_flow_id = ANY(cf.flow_ids)
            WHERE ga.deleted_at IS NULL
              AND ga.status = 'completed'
              AND ga.synced_at IS NOT NULL

            UNION ALL

            -- Priority 2: Approved assets (not synced)
            SELECT
              cf.collection_id,
              ga.asset_url as thumbnail_url,
              2 as priority,
              ga.created_at
            FROM collection_flows cf
            INNER JOIN generated_asset ga ON ga.generation_flow_id = ANY(cf.flow_ids)
            WHERE ga.deleted_at IS NULL
              AND ga.status = 'completed'
              AND ga.synced_at IS NULL
              AND ga.approval_status = 'approved'

            UNION ALL

            -- Priority 3: Favorite assets (not synced, not approved)
            SELECT
              cf.collection_id,
              ga.asset_url as thumbnail_url,
              3 as priority,
              ga.created_at
            FROM collection_flows cf
            INNER JOIN generated_asset ga ON ga.generation_flow_id = ANY(cf.flow_ids)
            INNER JOIN favorite_image fi ON fi.generated_asset_id = ga.id
            WHERE ga.deleted_at IS NULL
              AND ga.status = 'completed'
              AND ga.synced_at IS NULL
              AND ga.approval_status != 'approved'

            UNION ALL

            -- Priority 4: Regular unrated assets
            SELECT
              cf.collection_id,
              ga.asset_url as thumbnail_url,
              4 as priority,
              ga.created_at
            FROM collection_flows cf
            INNER JOIN generated_asset ga ON ga.generation_flow_id = ANY(cf.flow_ids)
            LEFT JOIN favorite_image fi ON fi.generated_asset_id = ga.id
            WHERE ga.deleted_at IS NULL
              AND ga.status = 'completed'
              AND ga.synced_at IS NULL
              AND ga.approval_status != 'approved'
              AND fi.id IS NULL

            UNION ALL

            -- Priority 5: Product base images as fallback
            SELECT
              cf.collection_id,
              pi.image_url as thumbnail_url,
              5 as priority,
              pi.created_at
            FROM collection_flows cf
            CROSS JOIN LATERAL jsonb_array_elements_text(
              (SELECT cs.product_ids FROM ${collectionSession} cs WHERE cs.id = cf.collection_id)
            ) AS product_id
            INNER JOIN product_image pi ON pi.product_id = product_id::text
            WHERE pi.is_primary = true
          ) combined
        ) ranked
        WHERE rn <= 4
        GROUP BY collection_id
      )
      SELECT
        cs.*,
        COALESCE(ast.total_images, 0) as total_images,
        COALESCE(ast.completed_count, 0) as completed_count,
        COALESCE(ast.generating_count, 0) as generating_count,
        COALESCE(ct.thumbnails, ARRAY[]::text[]) as thumbnails
      FROM ${collectionSession} cs
      LEFT JOIN asset_stats ast ON cs.id = ast.collection_id
      LEFT JOIN collection_thumbnails ct ON cs.id = ct.collection_id
      WHERE cs.client_id = ${clientId}
        ${options.search ? sql`AND cs.name ILIKE ${`%${options.search}%`}` : sql``}
        ${options.status && options.status !== 'all' ? sql`AND cs.status = ${options.status}` : sql``}
      ORDER BY ${
        options.sort === 'name'
          ? sql`cs.name ASC`
          : options.sort === 'productCount'
            ? sql`jsonb_array_length(cs.product_ids) DESC`
            : sql`cs.updated_at DESC`
      }
      LIMIT ${options.limit ?? 100}
      OFFSET ${options.offset ?? 0}
    `);

    return (rows.rows as any[]).map((row) => ({
      id: row.id,
      clientId: row.client_id,
      name: row.name,
      status: row.status as CollectionSessionStatus,
      productIds: row.product_ids ?? [],
      selectedBaseImages: row.selected_base_images ?? {},
      settings: row.settings,
      version: row.version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      totalImages: row.total_images,
      completedCount: row.completed_count,
      generatingCount: row.generating_count,
      thumbnails: row.thumbnails ?? [],
    }));
  }
}
