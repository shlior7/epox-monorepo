import { and, asc, desc, eq, ilike, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import type { Product, ProductCreate, ProductImage, ProductSource, ProductUpdate, ProductWithImages } from 'visualizer-types';
import type { DrizzleClient } from '../client';
import { product, productImage } from '../schema/products';
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
        erpId: data.erpId ?? null,
        erpSku: data.erpSku ?? null,
        erpUrl: data.erpUrl ?? null,
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
          ilike(product.erpSku, `%${options.search}%`)
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

  // ===== COUNT =====

  async count(clientId: string): Promise<number> {
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(product)
      .where(eq(product.clientId, clientId));

    return result.count;
  }
}
