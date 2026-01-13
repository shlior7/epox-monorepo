/**
 * Store Sync Schema
 * Store connections (OAuth) and sync logs for e-commerce integrations
 */

import { pgTable, text, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client } from './auth';
import { generatedAsset } from './generated-images';
import { product } from './products';

// Store types supported
export type StoreType = 'shopify' | 'woocommerce' | 'bigcommerce';
export type StoreConnectionStatus = 'active' | 'disconnected' | 'error';
export type SyncAction = 'upload' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'success' | 'failed';

// ===== STORE CONNECTION =====
export const storeConnection = pgTable(
  'store_connection',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),

    // Store details
    storeType: text('store_type').$type<StoreType>().notNull(),
    storeUrl: text('store_url').notNull(),
    storeName: text('store_name'),

    // Encrypted credentials payload
    credentialsCiphertext: text('credentials_ciphertext').notNull(),
    credentialsIv: text('credentials_iv').notNull(),
    credentialsTag: text('credentials_tag').notNull(),
    credentialsKeyId: text('credentials_key_id').notNull(),
    credentialsFingerprint: text('credentials_fingerprint'),
    tokenExpiresAt: timestamp('token_expires_at', { mode: 'date' }),

    // Sync settings
    autoSyncEnabled: boolean('auto_sync_enabled').notNull().default(false),
    syncOnApproval: boolean('sync_on_approval').notNull().default(true),

    // Status
    status: text('status').$type<StoreConnectionStatus>().notNull().default('active'),
    lastSyncAt: timestamp('last_sync_at', { mode: 'date' }),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('store_connection_client_id_idx').on(table.clientId),
    unique('store_connection_unique').on(table.clientId, table.storeType, table.storeUrl),
  ]
);

// ===== STORE SYNC LOG =====
export const storeSyncLog = pgTable(
  'store_sync_log',
  {
    id: text('id').primaryKey(),
    storeConnectionId: text('store_connection_id')
      .notNull()
      .references(() => storeConnection.id, { onDelete: 'cascade' }),
    generatedAssetId: text('generated_asset_id')
      .notNull()
      .references(() => generatedAsset.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),

    // Sync details
    action: text('action').$type<SyncAction>().notNull(),
    status: text('status').$type<SyncStatus>().notNull().default('pending'),
    externalImageUrl: text('external_image_url'), // URL in the store after upload
    errorMessage: text('error_message'),

    // Timing
    startedAt: timestamp('started_at', { mode: 'date' }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  },
  (table) => [
    index('store_sync_log_store_connection_id_idx').on(table.storeConnectionId),
    index('store_sync_log_generated_asset_id_idx').on(table.generatedAssetId),
    index('store_sync_log_product_id_idx').on(table.productId),
    index('store_sync_log_status_idx').on(table.status),
  ]
);

// ===== RELATIONS =====
export const storeConnectionRelations = relations(storeConnection, ({ one, many }) => ({
  client: one(client, {
    fields: [storeConnection.clientId],
    references: [client.id],
  }),
  syncLogs: many(storeSyncLog),
}));

export const storeSyncLogRelations = relations(storeSyncLog, ({ one }) => ({
  storeConnection: one(storeConnection, {
    fields: [storeSyncLog.storeConnectionId],
    references: [storeConnection.id],
  }),
  generatedAsset: one(generatedAsset, {
    fields: [storeSyncLog.generatedAssetId],
    references: [generatedAsset.id],
  }),
  product: one(product, {
    fields: [storeSyncLog.productId],
    references: [product.id],
  }),
}));
