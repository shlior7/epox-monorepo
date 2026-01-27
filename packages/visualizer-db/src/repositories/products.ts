import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import type {
  Product,
  ProductCreate,
  ProductImage,
  ProductSource,
  ProductUpdate,
  ProductWithImages,
  StoreProductView,
  GeneratedAssetWithSync,
  AssetSyncStatus,
} from 'visualizer-types';
import type { DrizzleClient } from '../client';
import { product, productImage } from '../schema/products';
import { generatedAsset, favoriteImage } from '../schema/generated-images';
import { storeSyncLog } from '../schema/store-sync';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

export interface ProductListOptions {
  search?: string;
  category?: string;
  sceneType?: string; // Renamed from sceneType
  source?: ProductSource;
  analyzed?: boolean;
  sort?: 'name' | 'price' | 'category' | 'created' | 'updated';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Repository for Product table.
 *
 * NOTE: For the many-to-many relationship with generation flows,
 * use db.generationFlowProducts to manage the junction table entries.
 */
export class ProductRepository extends BaseRepository<Product> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, product);
  }

  async create(clientId: string, data: ProductCreate): Promise<Product> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(product)
      .values({
        id,
        clientId,
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? null,
        sceneTypes: data.sceneTypes ?? null,
        modelFilename: data.modelFilename ?? null,
        isFavorite: data.isFavorite ?? false,
        source: data.source ?? 'uploaded',
        storeConnectionId: data.storeConnectionId ?? null,
        storeId: data.storeId ?? null,
        storeSku: data.storeSku ?? null,
        storeUrl: data.storeUrl ?? null,
        storeName: data.storeName ?? null,
        importedAt: data.importedAt ?? null,
        analysisData: data.analysisData ?? null,
        analysisVersion: data.analysisVersion ?? null,
        analyzedAt: data.analyzedAt ?? null,
        price: data.price ?? null,
        metadata: data.metadata ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async list(clientId: string): Promise<Product[]> {
    const rows = await this.drizzle.select().from(product).where(eq(product.clientId, clientId)).orderBy(asc(product.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listWithImages(clientId: string): Promise<ProductWithImages[]> {
    const rows = await this.drizzle.query.product.findMany({
      where: eq(product.clientId, clientId),
      with: { images: true },
      orderBy: [asc(product.createdAt)],
    });

    return rows.map((row) => ({
      ...this.mapToEntity(row),
      images: row.images.map((image) => image as ProductImage),
    }));
  }

  async getWithImages(id: string): Promise<ProductWithImages | null> {
    const row = await this.drizzle.query.product.findFirst({
      where: eq(product.id, id),
      with: { images: true },
    });

    if (!row) {
      return null;
    }

    return {
      ...this.mapToEntity(row),
      images: row.images.map((image) => image as ProductImage),
    };
  }

  async listByIds(productIds: string[]): Promise<ProductWithImages[]> {
    if (productIds.length === 0) {
      return [];
    }

    const rows = await this.drizzle.query.product.findMany({
      where: inArray(product.id, productIds),
      with: { images: true },
    });

    return rows.map((row) => ({
      ...this.mapToEntity(row),
      images: row.images.map((image) => image as ProductImage),
    }));
  }

  async findByStoreId(clientId: string, storeId: string): Promise<Product | null> {
    const row = await this.drizzle.query.product.findFirst({
      where: and(eq(product.clientId, clientId), eq(product.storeId, storeId)),
    });

    if (!row) {
      return null;
    }

    return this.mapToEntity(row);
  }

  /**
   * Find product by store connection ID and external store product ID.
   * Uses the optimized index on (store_connection_id, store_id).
   */
  async findByStoreConnection(storeConnectionId: string, externalStoreId: string): Promise<Product | null> {
    const row = await this.drizzle.query.product.findFirst({
      where: and(eq(product.storeConnectionId, storeConnectionId), eq(product.storeId, externalStoreId)),
    });

    if (!row) {
      return null;
    }

    return this.mapToEntity(row);
  }

  async update(id: string, data: Partial<ProductUpdate>, expectedVersion?: number): Promise<Product> {
    return updateWithVersion<Product>(this.drizzle, product, id, data, expectedVersion);
  }

  // ===== LIST WITH FILTERS =====

  async listWithFiltersAndImages(clientId: string, options: ProductListOptions = {}): Promise<ProductWithImages[]> {
    const conditions = this.buildFilterConditions(clientId, options);
    const orderByClause = this.getOrderByClause(options.sort, options.order);

    const rows = await this.drizzle.query.product.findMany({
      where: and(...conditions),
      with: {
        images: {
          orderBy: asc(productImage.sortOrder),
        },
      },
      orderBy: orderByClause,
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
    });

    return rows.map((row) => ({
      ...this.mapToEntity(row),
      images: row.images.map((image) => image as ProductImage),
    }));
  }

  async countWithFilters(clientId: string, options: Omit<ProductListOptions, 'limit' | 'offset' | 'sort' | 'order'> = {}): Promise<number> {
    const conditions = this.buildFilterConditions(clientId, options);

    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(product)
      .where(and(...conditions));

    return result.count;
  }

  private buildFilterConditions(clientId: string, options: Omit<ProductListOptions, 'limit' | 'offset' | 'sort' | 'order'>): SQL[] {
    const conditions: SQL[] = [eq(product.clientId, clientId)];

    if (options.search) {
      conditions.push(
        or(
          ilike(product.name, `%${options.search}%`),
          ilike(product.description, `%${options.search}%`),
          ilike(product.storeSku, `%${options.search}%`)
        )!
      );
    }

    if (options.category) {
      conditions.push(eq(product.category, options.category));
    }

    if (options.source) {
      conditions.push(eq(product.source, options.source));
    }

    if (options.analyzed === true) {
      conditions.push(isNotNull(product.analyzedAt));
    } else if (options.analyzed === false) {
      conditions.push(sql`${product.analyzedAt} IS NULL`);
    }

    if (options.sceneType) {
      conditions.push(sql`${product.sceneTypes} @> ${JSON.stringify([options.sceneType])}::jsonb`);
    }

    return conditions;
  }

  private getOrderByClause(sort?: string, order?: 'asc' | 'desc') {
    const orderFn = order === 'asc' ? asc : desc;

    switch (sort) {
      case 'name':
        return orderFn(product.name);
      case 'price':
        return orderFn(product.price);
      case 'category':
        return orderFn(product.category);
      case 'created':
        return orderFn(product.createdAt);
      case 'updated':
      case undefined:
        return orderFn(product.updatedAt);
      default:
        return orderFn(product.updatedAt);
    }
  }

  // ===== DISTINCT VALUES (for filter options) =====

  async getDistinctCategories(clientId: string): Promise<string[]> {
    const rows = await this.drizzle.selectDistinct({ category: product.category }).from(product).where(eq(product.clientId, clientId));

    return rows
      .map((r) => r.category)
      .filter((c): c is string => c != null)
      .sort();
  }

  async getDistinctSceneTypes(clientId: string): Promise<string[]> {
    const rows = await this.drizzle.select({ sceneTypes: product.sceneTypes }).from(product).where(eq(product.clientId, clientId));

    const sceneTypesSet = new Set<string>();
    for (const r of rows) {
      const types = r.sceneTypes;
      if (types) {
        for (const t of types) {
          sceneTypesSet.add(t);
        }
      }
    }
    return Array.from(sceneTypesSet).sort();
  }

  // ===== GET NAMES BY IDS (for batch lookup) =====

  async getNamesByIds(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }

    const rows = await this.drizzle.select({ id: product.id, name: product.name }).from(product).where(inArray(product.id, ids));

    return new Map(rows.map((p) => [p.id, p.name]));
  }

  // ===== GET BY IDS (batch fetch for N+1 elimination) =====

  async getByIds(ids: string[]): Promise<Map<string, Product>> {
    if (ids.length === 0) {
      return new Map();
    }

    const rows = await this.drizzle.select().from(product).where(inArray(product.id, ids));

    return new Map(rows.map((row) => [row.id, this.mapToEntity(row)]));
  }

  // ===== COUNT =====

  async count(clientId: string): Promise<number> {
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(product)
      .where(eq(product.clientId, clientId));

    return result.count;
  }

  // ===== LIST FOR STORE PAGE =====

  /**
   * List ALL products with their base images and generated assets for the Store page.
   * Returns products with:
   * - baseImages: The product's original images (from product_image table)
   * - syncedAssets: Generated assets that have been successfully synced to store
   * - unsyncedAssets: Generated assets not yet synced (pending, failed, or not_synced)
   *
   * Products are ordered by: mapped products first, then by name
   */
  async listForStorePage(clientId: string, storeConnectionId: string): Promise<StoreProductView[]> {
    // Fetch all products with their images
    const productsWithImages = await this.drizzle.query.product.findMany({
      where: eq(product.clientId, clientId),
      with: {
        images: {
          orderBy: asc(productImage.sortOrder),
        },
      },
      orderBy: [
        // Mapped products first (those with storeId)
        sql`CASE WHEN ${product.storeId} IS NOT NULL THEN 0 ELSE 1 END`,
        asc(product.name),
      ],
    });

    if (productsWithImages.length === 0) {
      return [];
    }

    const productIds = productsWithImages.map((p) => p.id);

    // Fetch all generated assets for these products with their sync status
    const assetsResult = await this.drizzle.execute(sql`
      WITH asset_sync_status AS (
        SELECT DISTINCT ON (ga.id)
          ga.*,
          ssl.status as sync_status,
          ssl.external_image_url,
          ssl.error_message as sync_error,
          ssl.completed_at as last_synced_at,
          CASE WHEN fi.id IS NOT NULL THEN true ELSE false END as is_favorite
        FROM ${generatedAsset} ga
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
          AND ga.status = 'completed'
      )
      SELECT
        id,
        client_id as "clientId",
        generation_flow_id as "generationFlowId",
        chat_session_id as "chatSessionId",
        asset_url as "assetUrl",
        asset_type as "assetType",
        status,
        prompt,
        settings,
        product_ids as "productIds",
        job_id as "jobId",
        error,
        asset_analysis as "assetAnalysis",
        analysis_version as "analysisVersion",
        approval_status as "approvalStatus",
        approved_at as "approvedAt",
        approved_by as "approvedBy",
        completed_at as "completedAt",
        pinned,
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt",
        COALESCE(sync_status, 'not_synced') as "syncStatus",
        last_synced_at as "lastSyncedAt",
        external_image_url as "externalImageUrl",
        external_image_id as "externalImageId",
        sync_error as "syncError",
        is_favorite as "isFavorite"
      FROM asset_sync_status
      ORDER BY
        CASE WHEN sync_status = 'success' THEN 0 ELSE 1 END,
        CASE WHEN is_favorite = true THEN 0 ELSE 1 END,
        created_at DESC
    `);

    // Type the raw result
    type RawAssetRow = {
      id: string;
      clientId: string;
      generationFlowId: string | null;
      chatSessionId: string | null;
      assetUrl: string;
      assetType: string;
      status: string;
      prompt: string | null;
      settings: unknown;
      productIds: string[] | null;
      jobId: string | null;
      error: string | null;
      assetAnalysis: unknown;
      analysisVersion: string | null;
      approvalStatus: string;
      approvedAt: string | null;
      approvedBy: string | null;
      completedAt: string | null;
      pinned: boolean;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      syncStatus: string;
      lastSyncedAt: string | null;
      externalImageUrl: string | null;
      externalImageId: string | null;
      syncError: string | null;
      isFavorite: boolean;
    };

    const rawAssets = assetsResult.rows as RawAssetRow[];

    // Create a map of productId -> assets
    const assetsByProductId = new Map<string, GeneratedAssetWithSync[]>();
    for (const asset of rawAssets) {
      if (!asset.productIds) continue;
      for (const productId of asset.productIds) {
        if (!assetsByProductId.has(productId)) {
          assetsByProductId.set(productId, []);
        }
        assetsByProductId.get(productId)!.push({
          id: asset.id,
          clientId: asset.clientId,
          generationFlowId: asset.generationFlowId,
          chatSessionId: asset.chatSessionId,
          assetUrl: asset.assetUrl,
          assetType: asset.assetType as 'image' | 'video',
          status: asset.status as 'pending' | 'generating' | 'completed' | 'error',
          prompt: asset.prompt,
          settings: asset.settings as any,
          productIds: asset.productIds,
          jobId: asset.jobId,
          error: asset.error,
          assetAnalysis: asset.assetAnalysis as any,
          analysisVersion: asset.analysisVersion,
          approvalStatus: asset.approvalStatus as 'pending' | 'approved' | 'rejected',
          approvedAt: asset.approvedAt ? new Date(asset.approvedAt) : null,
          approvedBy: asset.approvedBy,
          completedAt: asset.completedAt ? new Date(asset.completedAt) : null,
          pinned: asset.pinned,
          createdAt: new Date(asset.createdAt),
          updatedAt: new Date(asset.updatedAt),
          deletedAt: asset.deletedAt ? new Date(asset.deletedAt) : null,
          syncStatus: (asset.syncStatus === 'success' ? 'synced' : asset.syncStatus) as AssetSyncStatus,
          lastSyncedAt: asset.lastSyncedAt ? new Date(asset.lastSyncedAt) : undefined,
          externalImageUrl: asset.externalImageUrl ?? undefined,
          syncError: asset.syncError ?? undefined,
          isFavorite: asset.isFavorite,
          externalImageId: asset.externalImageId ?? null,
        });
      }
    }

    // Build the StoreProductView array
    return productsWithImages.map((p) => {
      const assets = assetsByProductId.get(p.id) ?? [];
      const syncedAssets = assets.filter((a) => a.syncStatus === 'synced');
      const unsyncedAssets = assets.filter((a) => a.syncStatus !== 'synced');

      return {
        product: this.mapToEntity(p),
        baseImages: p.images.map((img) => ({
          id: img.id,
          productId: img.productId,
          imageUrl: img.imageUrl,
          previewUrl: img.previewUrl,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
          syncStatus: img.syncStatus ?? 'local',
          originalStoreUrl: img.originalStoreUrl ?? null,
          externalImageId: img.externalImageId ?? null,
          version: img.version,
          createdAt: img.createdAt,
          updatedAt: img.updatedAt,
        })),
        isMappedToStore: p.storeId !== null,
        syncedAssets,
        unsyncedAssets,
        syncedCount: syncedAssets.length,
        unsyncedCount: unsyncedAssets.length,
        totalAssetCount: assets.length,
      };
    });
  }
}
