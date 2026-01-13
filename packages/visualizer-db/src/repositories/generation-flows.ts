import { asc, eq, inArray } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { generationFlow } from '../schema/sessions';
import type { GenerationFlow, GenerationFlowCreate, FlowGenerationSettings, GenerationFlowUpdate } from 'visualizer-types';
import { DEFAULT_FLOW_SETTINGS, DEFAULT_POST_ADJUSTMENTS } from 'visualizer-types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

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

export class GenerationFlowRepository extends BaseRepository<GenerationFlow> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, generationFlow);
  }

  async create(clientId: string, data: GenerationFlowCreate): Promise<GenerationFlow> {
    const id = this.generateId();
    const now = new Date();
    const settings = mergeFlowSettings(DEFAULT_FLOW_SETTINGS, data.settings ?? {});

    const [created] = await this.drizzle
      .insert(generationFlow)
      .values({
        id,
        collectionSessionId: data.collectionSessionId ?? null,
        clientId,
        name: data.name ?? null,
        productIds: data.productIds ?? [],
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

    return this.mapToEntity(created);
  }

  async createWithId(
    id: string,
    clientId: string,
    data: GenerationFlowCreate & { status?: GenerationFlow['status']; currentImageIndex?: number; createdAt?: Date; updatedAt?: Date }
  ): Promise<GenerationFlow> {
    const now = new Date();
    const settings = mergeFlowSettings(DEFAULT_FLOW_SETTINGS, data.settings ?? {});

    const [created] = await this.drizzle
      .insert(generationFlow)
      .values({
        id,
        collectionSessionId: data.collectionSessionId ?? null,
        clientId,
        name: data.name ?? null,
        productIds: data.productIds ?? [],
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

    return this.mapToEntity(created);
  }

  async createBatchWithIds(
    clientId: string,
    entries: Array<
      GenerationFlowCreate & { id: string; status?: GenerationFlow['status']; currentImageIndex?: number; createdAt?: Date; updatedAt?: Date }
    >
  ): Promise<GenerationFlow[]> {
    if (entries.length === 0) return [];

    const now = new Date();
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
    if (collectionSessionIds.length === 0) {
      return [];
    }

    const rows = await this.drizzle
      .select()
      .from(generationFlow)
      .where(inArray(generationFlow.collectionSessionId, collectionSessionIds))
      .orderBy(asc(generationFlow.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async deleteByCollectionSession(collectionSessionId: string): Promise<void> {
    await this.drizzle.delete(generationFlow).where(eq(generationFlow.collectionSessionId, collectionSessionId));
  }

  async update(id: string, data: GenerationFlowUpdate, expectedVersion?: number): Promise<GenerationFlow> {
    if (data.settings) {
      const current = await this.requireById(id);
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
      }
    }

    const nextSelected = { ...current.selectedBaseImages };
    if (baseImageIds) {
      for (const [productId, imageId] of Object.entries(baseImageIds)) {
        nextSelected[productId] = imageId;
      }
    }

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
}
