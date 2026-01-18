import { asc, eq, inArray, and, sql } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { generationFlow, generationFlowProduct } from '../schema/sessions';
import type { GenerationFlow, GenerationFlowCreate, FlowGenerationSettings, GenerationFlowUpdate } from 'visualizer-types';
import { DEFAULT_FLOW_SETTINGS, DEFAULT_POST_ADJUSTMENTS } from 'visualizer-types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

const MAX_PRODUCTS_PER_FLOW = 3;
const MAX_FLOWS_PER_PRODUCT = 10;

function mergeFlowSettings(
  base: FlowGenerationSettings,
  updates: Partial<FlowGenerationSettings>
): FlowGenerationSettings {
  const merged = { ...base, ...updates };
  if (updates.postAdjustments) {
    merged.postAdjustments = {
      light: {
        ...(base.postAdjustments?.light ?? DEFAULT_POST_ADJUSTMENTS.light),
        ...updates.postAdjustments.light,
      },
      color: {
        ...(base.postAdjustments?.color ?? DEFAULT_POST_ADJUSTMENTS.color),
        ...updates.postAdjustments.color,
      },
      effects: {
        ...(base.postAdjustments?.effects ?? DEFAULT_POST_ADJUSTMENTS.effects),
        ...updates.postAdjustments.effects,
      },
    };
  }
  return merged;
}

/**
 * Repository for GenerationFlow table.
 * Automatically manages the many-to-many relationship with products via junction table.
 */
export class GenerationFlowRepository extends BaseRepository<GenerationFlow> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, generationFlow);
  }

  // ===== Junction Table Helpers =====

  private async validateMaxProductsPerFlow(productIds: string[]): Promise<void> {
    if (productIds.length > MAX_PRODUCTS_PER_FLOW) {
      throw new Error(`Generation flow cannot have more than ${MAX_PRODUCTS_PER_FLOW} products`);
    }
  }

  private async validateMaxFlowsPerProducts(productIds: string[]): Promise<void> {
    if (productIds.length === 0) {return;}

    const counts = await this.drizzle
      .select({
        productId: generationFlowProduct.productId,
        count: sql<number>`count(*)::int`,
      })
      .from(generationFlowProduct)
      .where(inArray(generationFlowProduct.productId, productIds))
      .groupBy(generationFlowProduct.productId);

    for (const { productId, count } of counts) {
      if (count >= MAX_FLOWS_PER_PRODUCT) {
        throw new Error(`Product ${productId} already has ${MAX_FLOWS_PER_PRODUCT} generation flows`);
      }
    }
  }

  private async linkProducts(flowId: string, productIds: string[], createdAt: Date): Promise<void> {
    if (productIds.length === 0) {return;}

    await this.drizzle.insert(generationFlowProduct).values(
      productIds.map((productId) => ({
        id: this.generateId(),
        generationFlowId: flowId,
        productId,
        createdAt,
      }))
    );
  }

  private async unlinkProducts(flowId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) {return;}

    await this.drizzle
      .delete(generationFlowProduct)
      .where(
        and(
          eq(generationFlowProduct.generationFlowId, flowId),
          inArray(generationFlowProduct.productId, productIds)
        )
      );
  }

  private async unlinkAllProducts(flowId: string): Promise<void> {
    await this.drizzle
      .delete(generationFlowProduct)
      .where(eq(generationFlowProduct.generationFlowId, flowId));
  }

  // ===== CRUD Operations =====

  async create(clientId: string, data: GenerationFlowCreate): Promise<GenerationFlow> {
    const id = this.generateId();
    const now = new Date();
    const settings = mergeFlowSettings(DEFAULT_FLOW_SETTINGS, data.settings ?? {});
    const productIds = data.productIds ?? [];

    // Validate constraints
    await this.validateMaxProductsPerFlow(productIds);
    await this.validateMaxFlowsPerProducts(productIds);

    const [created] = await this.drizzle
      .insert(generationFlow)
      .values({
        id,
        collectionSessionId: data.collectionSessionId ?? null,
        clientId,
        name: data.name ?? null,
        productIds,
        selectedBaseImages: data.selectedBaseImages ?? {},
        status: 'empty',
        settings,
        isFavorite: data.isFavorite ?? false,
        currentImageIndex: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Link products in junction table
    await this.linkProducts(id, productIds, now);

    return this.mapToEntity(created);
  }

  async createWithId(
    id: string,
    clientId: string,
    data: GenerationFlowCreate & { status?: GenerationFlow['status']; currentImageIndex?: number; createdAt?: Date; updatedAt?: Date }
  ): Promise<GenerationFlow> {
    const now = new Date();
    const settings = mergeFlowSettings(DEFAULT_FLOW_SETTINGS, data.settings ?? {});
    const productIds = data.productIds ?? [];

    // Validate constraints
    await this.validateMaxProductsPerFlow(productIds);
    await this.validateMaxFlowsPerProducts(productIds);

    const [created] = await this.drizzle
      .insert(generationFlow)
      .values({
        id,
        collectionSessionId: data.collectionSessionId ?? null,
        clientId,
        name: data.name ?? null,
        productIds,
        selectedBaseImages: data.selectedBaseImages ?? {},
        status: data.status ?? 'empty',
        settings,
        isFavorite: data.isFavorite ?? false,
        currentImageIndex: data.currentImageIndex ?? 0,
        version: 1,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      })
      .returning();

    // Link products in junction table
    await this.linkProducts(id, productIds, data.createdAt ?? now);

    return this.mapToEntity(created);
  }

  async createBatchWithIds(
    clientId: string,
    entries: Array<
      GenerationFlowCreate & { id: string; status?: GenerationFlow['status']; currentImageIndex?: number; createdAt?: Date; updatedAt?: Date }
    >
  ): Promise<GenerationFlow[]> {
    if (entries.length === 0) {return [];}

    const now = new Date();

    // Validate all entries
    for (const entry of entries) {
      await this.validateMaxProductsPerFlow(entry.productIds ?? []);
    }

    // Collect all product IDs to validate
    const allProductIds = [...new Set(entries.flatMap((e) => e.productIds ?? []))];
    await this.validateMaxFlowsPerProducts(allProductIds);

    const rows = await this.drizzle
      .insert(generationFlow)
      .values(
        entries.map((entry) => ({
          id: entry.id,
          collectionSessionId: entry.collectionSessionId ?? null,
          clientId,
          name: entry.name ?? null,
          productIds: entry.productIds ?? [],
          selectedBaseImages: entry.selectedBaseImages ?? {},
          status: entry.status ?? 'empty',
          settings: mergeFlowSettings(DEFAULT_FLOW_SETTINGS, entry.settings ?? {}),
          isFavorite: entry.isFavorite ?? false,
          currentImageIndex: entry.currentImageIndex ?? 0,
          version: 1,
          createdAt: entry.createdAt ?? now,
          updatedAt: entry.updatedAt ?? now,
        }))
      )
      .returning();

    // Link all products in junction table
    const junctionValues: Array<{ id: string; generationFlowId: string; productId: string; createdAt: Date }> = [];
    for (const entry of entries) {
      for (const productId of entry.productIds ?? []) {
        junctionValues.push({
          id: this.generateId(),
          generationFlowId: entry.id,
          productId,
          createdAt: entry.createdAt ?? now,
        });
      }
    }

    if (junctionValues.length > 0) {
      await this.drizzle.insert(generationFlowProduct).values(junctionValues);
    }

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByCollectionSession(collectionSessionId: string): Promise<GenerationFlow[]> {
    const rows = await this.drizzle
      .select()
      .from(generationFlow)
      .where(eq(generationFlow.collectionSessionId, collectionSessionId))
      .orderBy(asc(generationFlow.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByClient(clientId: string): Promise<GenerationFlow[]> {
    const rows = await this.drizzle
      .select()
      .from(generationFlow)
      .where(eq(generationFlow.clientId, clientId))
      .orderBy(asc(generationFlow.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByCollectionSessionIds(collectionSessionIds: string[]): Promise<GenerationFlow[]> {
    if (collectionSessionIds.length === 0) {return [];}

    const rows = await this.drizzle
      .select()
      .from(generationFlow)
      .where(inArray(generationFlow.collectionSessionId, collectionSessionIds))
      .orderBy(asc(generationFlow.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  /** List all flows that contain a specific product */
  async listByProduct(productId: string): Promise<GenerationFlow[]> {
    const rows = await this.drizzle
      .select({ flow: generationFlow })
      .from(generationFlow)
      .innerJoin(generationFlowProduct, eq(generationFlow.id, generationFlowProduct.generationFlowId))
      .where(eq(generationFlowProduct.productId, productId))
      .orderBy(asc(generationFlow.createdAt));

    return rows.map((r) => this.mapToEntity(r.flow));
  }

  async deleteByCollectionSession(collectionSessionId: string): Promise<void> {
    // Junction table entries are deleted via CASCADE
    await this.drizzle.delete(generationFlow).where(eq(generationFlow.collectionSessionId, collectionSessionId));
  }

  override async delete(id: string): Promise<void> {
    // Junction table entries are deleted via CASCADE
    await super.delete(id);
  }

  async update(id: string, data: GenerationFlowUpdate, expectedVersion?: number): Promise<GenerationFlow> {
    const current = await this.requireById(id);

    // Handle productIds update - sync junction table
    if (data.productIds !== undefined) {
      const newProductIds = data.productIds;
      const currentProductIds = current.productIds;

      await this.validateMaxProductsPerFlow(newProductIds);

      // Find products to add and remove
      const toAdd = newProductIds.filter((pid) => !currentProductIds.includes(pid));
      const toRemove = currentProductIds.filter((pid) => !newProductIds.includes(pid));

      // Validate max flows per product for new products
      await this.validateMaxFlowsPerProducts(toAdd);

      // Update junction table
      await this.unlinkProducts(id, toRemove);
      await this.linkProducts(id, toAdd, new Date());
    }

    if (data.settings) {
      const mergedSettings = mergeFlowSettings(current.settings, data.settings);
      return updateWithVersion<GenerationFlow>(this.drizzle, generationFlow, id, { ...data, settings: mergedSettings }, expectedVersion);
    }

    return updateWithVersion<GenerationFlow>(this.drizzle, generationFlow, id, data as Partial<GenerationFlow>, expectedVersion);
  }

  async addProducts(
    id: string,
    productIds: string[],
    baseImageIds?: Record<string, string>,
    expectedVersion?: number
  ): Promise<GenerationFlow> {
    const current = await this.requireById(id);
    const mergedProductIds: string[] = [];
    const newProductIds: string[] = [];
    const seen = new Set<string>();

    for (const pid of current.productIds) {
      if (!seen.has(pid)) {
        seen.add(pid);
        mergedProductIds.push(pid);
      }
    }

    for (const pid of productIds) {
      if (!seen.has(pid)) {
        seen.add(pid);
        mergedProductIds.push(pid);
        newProductIds.push(pid);
      }
    }

    // Validate constraints
    await this.validateMaxProductsPerFlow(mergedProductIds);
    await this.validateMaxFlowsPerProducts(newProductIds);

    const nextSelected = { ...current.selectedBaseImages };
    if (baseImageIds) {
      for (const [productId, imageId] of Object.entries(baseImageIds)) {
        nextSelected[productId] = imageId;
      }
    }

    // Link new products in junction table
    await this.linkProducts(id, newProductIds, new Date());

    return updateWithVersion<GenerationFlow>(
      this.drizzle,
      generationFlow,
      id,
      {
        productIds: mergedProductIds,
        selectedBaseImages: nextSelected,
      },
      expectedVersion
    );
  }

  async removeProduct(id: string, productId: string, expectedVersion?: number): Promise<GenerationFlow> {
    const current = await this.requireById(id);
    const nextProductIds = current.productIds.filter((pid) => pid !== productId);
    const nextSelected = { ...current.selectedBaseImages };
    delete nextSelected[productId];

    // Unlink from junction table
    await this.unlinkProducts(id, [productId]);

    return updateWithVersion<GenerationFlow>(
      this.drizzle,
      generationFlow,
      id,
      {
        productIds: nextProductIds,
        selectedBaseImages: nextSelected,
      },
      expectedVersion
    );
  }

  async updateSettings(
    id: string,
    settings: Partial<FlowGenerationSettings>,
    expectedVersion?: number
  ): Promise<GenerationFlow> {
    const current = await this.requireById(id);
    const mergedSettings = mergeFlowSettings(current.settings, settings);
    return updateWithVersion<GenerationFlow>(this.drizzle, generationFlow, id, { settings: mergedSettings }, expectedVersion);
  }

  // ===== Junction Table Queries =====

  /** Get product IDs linked to a flow (via junction table) */
  async getLinkedProductIds(flowId: string): Promise<string[]> {
    const rows = await this.drizzle
      .select({ productId: generationFlowProduct.productId })
      .from(generationFlowProduct)
      .where(eq(generationFlowProduct.generationFlowId, flowId));
    return rows.map((r) => r.productId);
  }

  /** Count how many flows a product is linked to */
  async countFlowsForProduct(productId: string): Promise<number> {
    const result = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(generationFlowProduct)
      .where(eq(generationFlowProduct.productId, productId));
    return result[0]?.count ?? 0;
  }

  /** Check if a product can accept more flows */
  async canProductAcceptMoreFlows(productId: string): Promise<boolean> {
    const count = await this.countFlowsForProduct(productId);
    return count < MAX_FLOWS_PER_PRODUCT;
  }

  /** Get the limits */
  static get MAX_PRODUCTS_PER_FLOW(): number {
    return MAX_PRODUCTS_PER_FLOW;
  }

  static get MAX_FLOWS_PER_PRODUCT(): number {
    return MAX_FLOWS_PER_PRODUCT;
  }
}
