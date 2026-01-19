/**
 * Store Connection Repository
 * Manages store connections with encrypted credentials
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { storeConnection } from '../schema/store-sync';
import { BaseRepository } from './base';

// Types for the encrypted credentials storage
export interface EncryptedCredentials {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
  fingerprint: string | null;
}

export type StoreType = 'shopify' | 'woocommerce' | 'bigcommerce';
export type ConnectionStatus = 'active' | 'disconnected' | 'error';

export interface StoreConnectionRow {
  id: string;
  clientId: string;
  storeType: StoreType;
  storeUrl: string;
  storeName: string | null;
  credentialsCiphertext: string;
  credentialsIv: string;
  credentialsTag: string;
  credentialsKeyId: string;
  credentialsFingerprint: string | null;
  tokenExpiresAt: Date | null;
  autoSyncEnabled: boolean;
  syncOnApproval: boolean;
  status: ConnectionStatus;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreConnectionInfo {
  id: string;
  clientId: string;
  storeType: StoreType;
  storeUrl: string;
  storeName: string | null;
  status: ConnectionStatus;
  lastSyncAt: Date | null;
  autoSyncEnabled: boolean;
  syncOnApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreConnectionCreate {
  clientId: string;
  storeType: StoreType;
  storeUrl: string;
  storeName?: string | null;
  credentials: EncryptedCredentials;
  tokenExpiresAt?: Date | null;
  autoSyncEnabled?: boolean;
  syncOnApproval?: boolean;
}

export interface StoreConnectionUpdate {
  storeName?: string | null;
  credentials?: EncryptedCredentials;
  tokenExpiresAt?: Date | null;
  autoSyncEnabled?: boolean;
  syncOnApproval?: boolean;
  status?: ConnectionStatus;
  lastSyncAt?: Date | null;
}

export class StoreConnectionRepository extends BaseRepository<StoreConnectionRow> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, storeConnection);
  }

  /**
   * Create or update a store connection (upsert on clientId + storeType + storeUrl)
   */
  async upsert(data: StoreConnectionCreate): Promise<StoreConnectionRow> {
    const id = this.generateId();
    const now = new Date();

    const [result] = await this.drizzle
      .insert(storeConnection)
      .values({
        id,
        clientId: data.clientId,
        storeType: data.storeType,
        storeUrl: data.storeUrl,
        storeName: data.storeName ?? null,
        credentialsCiphertext: data.credentials.ciphertext,
        credentialsIv: data.credentials.iv,
        credentialsTag: data.credentials.tag,
        credentialsKeyId: data.credentials.keyId,
        credentialsFingerprint: data.credentials.fingerprint ?? null,
        tokenExpiresAt: data.tokenExpiresAt ?? null,
        autoSyncEnabled: data.autoSyncEnabled ?? false,
        syncOnApproval: data.syncOnApproval ?? true,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [storeConnection.clientId, storeConnection.storeType, storeConnection.storeUrl],
        set: {
          storeName: data.storeName ?? sql`${storeConnection.storeName}`,
          credentialsCiphertext: data.credentials.ciphertext,
          credentialsIv: data.credentials.iv,
          credentialsTag: data.credentials.tag,
          credentialsKeyId: data.credentials.keyId,
          credentialsFingerprint: data.credentials.fingerprint ?? null,
          tokenExpiresAt: data.tokenExpiresAt ?? null,
          status: 'active',
          updatedAt: now,
        },
      })
      .returning();

    return this.mapToEntity(result);
  }

  /**
   * Get store connection by client ID (most recent)
   */
  async getByClientId(clientId: string): Promise<StoreConnectionRow | null> {
    const rows = await this.drizzle
      .select()
      .from(storeConnection)
      .where(eq(storeConnection.clientId, clientId))
      .orderBy(desc(storeConnection.updatedAt))
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  /**
   * Get store connection by client ID and store type
   */
  async getByClientAndType(clientId: string, storeType: StoreType): Promise<StoreConnectionRow | null> {
    const rows = await this.drizzle
      .select()
      .from(storeConnection)
      .where(and(eq(storeConnection.clientId, clientId), eq(storeConnection.storeType, storeType)))
      .orderBy(desc(storeConnection.updatedAt))
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  /**
   * List all store connections for a client
   */
  async listByClientId(clientId: string): Promise<StoreConnectionRow[]> {
    const rows = await this.drizzle
      .select()
      .from(storeConnection)
      .where(eq(storeConnection.clientId, clientId))
      .orderBy(desc(storeConnection.updatedAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * Get store connection info (without credentials - safe for frontend)
   */
  async getInfoByClientId(clientId: string): Promise<StoreConnectionInfo | null> {
    const connection = await this.getByClientId(clientId);
    if (!connection) {
      return null;
    }
    return this.toInfo(connection);
  }

  /**
   * Update store connection
   */
  async update(id: string, data: StoreConnectionUpdate): Promise<StoreConnectionRow> {
    const now = new Date();

    const updateData: Record<string, unknown> = { updatedAt: now };

    if (data.storeName !== undefined) {
      updateData.storeName = data.storeName;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.lastSyncAt !== undefined) {
      updateData.lastSyncAt = data.lastSyncAt;
    }
    if (data.autoSyncEnabled !== undefined) {
      updateData.autoSyncEnabled = data.autoSyncEnabled;
    }
    if (data.syncOnApproval !== undefined) {
      updateData.syncOnApproval = data.syncOnApproval;
    }
    if (data.tokenExpiresAt !== undefined) {
      updateData.tokenExpiresAt = data.tokenExpiresAt;
    }

    if (data.credentials) {
      updateData.credentialsCiphertext = data.credentials.ciphertext;
      updateData.credentialsIv = data.credentials.iv;
      updateData.credentialsTag = data.credentials.tag;
      updateData.credentialsKeyId = data.credentials.keyId;
      updateData.credentialsFingerprint = data.credentials.fingerprint ?? null;
    }

    const [result] = await this.drizzle.update(storeConnection).set(updateData).where(eq(storeConnection.id, id)).returning();

    if (!result) {
      throw new Error(`Store connection not found: ${id}`);
    }

    return this.mapToEntity(result);
  }

  /**
   * Update connection status by client ID
   */
  async updateStatusByClientId(clientId: string, status: ConnectionStatus): Promise<void> {
    await this.drizzle
      .update(storeConnection)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(storeConnection.clientId, clientId));
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(clientId: string): Promise<void> {
    const now = new Date();
    await this.drizzle
      .update(storeConnection)
      .set({
        lastSyncAt: now,
        updatedAt: now,
      })
      .where(eq(storeConnection.clientId, clientId));
  }

  /**
   * Delete all store connections for a client
   */
  async deleteByClientId(clientId: string): Promise<void> {
    await this.drizzle.delete(storeConnection).where(eq(storeConnection.clientId, clientId));
  }

  /**
   * Check if client has any store connection
   */
  async hasConnection(clientId: string): Promise<boolean> {
    const rows = await this.drizzle
      .select({ id: storeConnection.id })
      .from(storeConnection)
      .where(eq(storeConnection.clientId, clientId))
      .limit(1);

    return rows.length > 0;
  }

  /**
   * Extract encrypted credentials from a connection row
   */
  getEncryptedCredentials(row: StoreConnectionRow): EncryptedCredentials {
    return {
      ciphertext: row.credentialsCiphertext,
      iv: row.credentialsIv,
      tag: row.credentialsTag,
      keyId: row.credentialsKeyId,
      fingerprint: row.credentialsFingerprint,
    };
  }

  /**
   * Convert row to safe info (no credentials)
   */
  private toInfo(row: StoreConnectionRow): StoreConnectionInfo {
    return {
      id: row.id,
      clientId: row.clientId,
      storeType: row.storeType,
      storeUrl: row.storeUrl,
      storeName: row.storeName,
      status: row.status,
      lastSyncAt: row.lastSyncAt,
      autoSyncEnabled: row.autoSyncEnabled,
      syncOnApproval: row.syncOnApproval,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
