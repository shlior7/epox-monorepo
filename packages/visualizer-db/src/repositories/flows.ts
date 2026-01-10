import { asc, eq, inArray } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { flow } from '../schema/sessions';
import type { Flow, FlowCreate, FlowGenerationSettings, FlowUpdate } from '../types';
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

export class FlowRepository extends BaseRepository<Flow> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, flow);
  }

  async create(studioSessionId: string, data: FlowCreate): Promise<Flow> {
    const id = this.generateId();
    const now = new Date();
    const settings = mergeFlowSettings(DEFAULT_FLOW_SETTINGS, data.settings ?? {});

    const [created] = await this.drizzle
      .insert(flow)
      .values({
        id,
        studioSessionId,
        name: data.name ?? null,
        productIds: data.productIds ?? [],
        selectedBaseImages: data.selectedBaseImages ?? {},
        status: 'empty',
        settings,
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
    studioSessionId: string,
    data: FlowCreate & { status?: Flow['status']; currentImageIndex?: number; createdAt?: Date; updatedAt?: Date }
  ): Promise<Flow> {
    const now = new Date();
    const settings = mergeFlowSettings(DEFAULT_FLOW_SETTINGS, data.settings ?? {});

    const [created] = await this.drizzle
      .insert(flow)
      .values({
        id,
        studioSessionId,
        name: data.name ?? null,
        productIds: data.productIds ?? [],
        selectedBaseImages: data.selectedBaseImages ?? {},
        status: data.status ?? 'empty',
        settings,
        currentImageIndex: data.currentImageIndex ?? 0,
        version: 1,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async createBatchWithIds(
    studioSessionId: string,
    entries: Array<
      FlowCreate & { id: string; status?: Flow['status']; currentImageIndex?: number; createdAt?: Date; updatedAt?: Date }
    >
  ): Promise<Flow[]> {
    if (entries.length === 0) return [];

    const now = new Date();
    const rows = await this.drizzle
      .insert(flow)
      .values(
        entries.map((entry) => ({
          id: entry.id,
          studioSessionId,
          name: entry.name ?? null,
          productIds: entry.productIds ?? [],
          selectedBaseImages: entry.selectedBaseImages ?? {},
          status: entry.status ?? 'empty',
          settings: mergeFlowSettings(DEFAULT_FLOW_SETTINGS, entry.settings ?? {}),
          currentImageIndex: entry.currentImageIndex ?? 0,
          version: 1,
          createdAt: entry.createdAt ?? now,
          updatedAt: entry.updatedAt ?? now,
        }))
      )
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async list(studioSessionId: string): Promise<Flow[]> {
    const rows = await this.drizzle
      .select()
      .from(flow)
      .where(eq(flow.studioSessionId, studioSessionId))
      .orderBy(asc(flow.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByStudioSessionIds(studioSessionIds: string[]): Promise<Flow[]> {
    if (studioSessionIds.length === 0) {
      return [];
    }

    const rows = await this.drizzle
      .select()
      .from(flow)
      .where(inArray(flow.studioSessionId, studioSessionIds))
      .orderBy(asc(flow.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async deleteByStudioSession(studioSessionId: string): Promise<void> {
    await this.drizzle.delete(flow).where(eq(flow.studioSessionId, studioSessionId));
  }

  async update(id: string, data: FlowUpdate, expectedVersion?: number): Promise<Flow> {
    if (data.settings) {
      const current = await this.requireById(id);
      const mergedSettings = mergeFlowSettings(current.settings, data.settings);
      return updateWithVersion<Flow>(this.drizzle, flow, id, { ...data, settings: mergedSettings }, expectedVersion);
    }

    return updateWithVersion<Flow>(this.drizzle, flow, id, data as Partial<Flow>, expectedVersion);
  }

  async addProducts(
    id: string,
    productIds: string[],
    baseImageIds?: Record<string, string>,
    expectedVersion?: number
  ): Promise<Flow> {
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

    return updateWithVersion<Flow>(
      this.drizzle,
      flow,
      id,
      {
        productIds: mergedProductIds,
        selectedBaseImages: nextSelected,
      },
      expectedVersion
    );
  }

  async removeProduct(id: string, productId: string, expectedVersion?: number): Promise<Flow> {
    const current = await this.requireById(id);
    const nextProductIds = current.productIds.filter((pid) => pid !== productId);
    const nextSelected = { ...current.selectedBaseImages };
    delete nextSelected[productId];

    return updateWithVersion<Flow>(
      this.drizzle,
      flow,
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
  ): Promise<Flow> {
    const current = await this.requireById(id);
    const mergedSettings = mergeFlowSettings(current.settings, settings);
    return updateWithVersion<Flow>(this.drizzle, flow, id, { settings: mergedSettings }, expectedVersion);
  }
}
