import { and, desc, eq, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { storeSyncLog } from '../schema/store-sync';
import type { SyncAction, SyncStatus } from '../schema/store-sync';
import { BaseRepository } from './base';

export interface StoreSyncLog {
  id: string;
  storeConnectionId: string;
  generatedAssetId: string;
  productId: string;
  action: SyncAction;
  status: SyncStatus;
  externalImageUrl: string | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface StoreSyncLogCreate {
  storeConnectionId: string;
  generatedAssetId: string;
  productId: string;
  action: SyncAction;
}

export interface StoreSyncLogUpdate {
  status?: SyncStatus;
  externalImageUrl?: string | null;
  errorMessage?: string | null;
  completedAt?: Date | null;
}

export interface StoreSyncLogListOptions {
  status?: SyncStatus;
  action?: SyncAction;
  limit?: number;
  offset?: number;
}

/**
 * Repository for StoreSyncLog table.
 * Tracks sync operations for generated assets to connected stores.
 */
export class StoreSyncLogRepository extends BaseRepository<StoreSyncLog> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, storeSyncLog);
  }

  /**
   * Create a new sync log entry with pending status
   */
  async create(data: StoreSyncLogCreate): Promise<StoreSyncLog> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(storeSyncLog)
      .values({
        id,
        storeConnectionId: data.storeConnectionId,
        generatedAssetId: data.generatedAssetId,
        productId: data.productId,
        action: data.action,
        status: 'pending',
        externalImageUrl: null,
        errorMessage: null,
        startedAt: now,
        completedAt: null,
      })
      .returning();

    return this.mapToEntity(created);
  }

  /**
   * Update sync log status and result data
   */
  async updateStatus(
    id: string,
    status: SyncStatus,
    data?: {
      externalImageUrl?: string;
      errorMessage?: string;
    }
  ): Promise<StoreSyncLog> {
    const now = new Date();

    const updateData: StoreSyncLogUpdate = {
      status,
      completedAt: status !== 'pending' ? now : null,
    };

    if (data?.externalImageUrl !== undefined) {
      updateData.externalImageUrl = data.externalImageUrl;
    }

    if (data?.errorMessage !== undefined) {
      updateData.errorMessage = data.errorMessage;
    }

    const [updated] = await this.drizzle
      .update(storeSyncLog)
      .set(updateData)
      .where(eq(storeSyncLog.id, id))
      .returning();

    if (!updated) {
      throw new Error(`StoreSyncLog with id ${id} not found`);
    }

    return this.mapToEntity(updated);
  }

  /**
   * Get the latest sync log for a specific asset
   */
  async getLatestByAsset(
    assetId: string,
    storeConnectionId: string
  ): Promise<StoreSyncLog | null> {
    const rows = await this.drizzle
      .select()
      .from(storeSyncLog)
      .where(
        and(
          eq(storeSyncLog.generatedAssetId, assetId),
          eq(storeSyncLog.storeConnectionId, storeConnectionId)
        )
      )
      .orderBy(desc(storeSyncLog.startedAt))
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  /**
   * List sync logs for a store connection with optional filters
   */
  async listByConnection(
    storeConnectionId: string,
    options: StoreSyncLogListOptions = {}
  ): Promise<StoreSyncLog[]> {
    const conditions: SQL[] = [eq(storeSyncLog.storeConnectionId, storeConnectionId)];

    if (options.status) {
      conditions.push(eq(storeSyncLog.status, options.status));
    }

    if (options.action) {
      conditions.push(eq(storeSyncLog.action, options.action));
    }

    const rows = await this.drizzle
      .select()
      .from(storeSyncLog)
      .where(and(...conditions))
      .orderBy(desc(storeSyncLog.startedAt))
      .limit(options.limit ?? 100)
      .offset(options.offset ?? 0);

    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * List sync logs for a specific asset (all history)
   */
  async listByAsset(
    assetId: string,
    storeConnectionId: string
  ): Promise<StoreSyncLog[]> {
    const rows = await this.drizzle
      .select()
      .from(storeSyncLog)
      .where(
        and(
          eq(storeSyncLog.generatedAssetId, assetId),
          eq(storeSyncLog.storeConnectionId, storeConnectionId)
        )
      )
      .orderBy(desc(storeSyncLog.startedAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * Delete all sync logs for a specific asset
   */
  async deleteByAsset(assetId: string): Promise<void> {
    await this.drizzle
      .delete(storeSyncLog)
      .where(eq(storeSyncLog.generatedAssetId, assetId));
  }
}
