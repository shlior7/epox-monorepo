/**
 * Schema Table Definitions for E2E Tests
 *
 * This file contains minimal table schema definitions needed for E2E tests.
 * We can't import from visualizer-db package due to Playwright TypeScript limitations.
 *
 * These are simplified versions - just enough for db.query and db.delete to work.
 */

import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from 'drizzle-orm/pg-core';

// Product table
export const product = pgTable('product', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  source: text('source'),
  storeUrl: text('store_url'),
  selectedSceneType: text('selected_scene_type'),
  isFavorite: boolean('is_favorite').default(false),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Collection session table
export const collectionSession = pgTable('collection_session', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull(),
  productIds: jsonb('product_ids').notNull(),
  selectedBaseImages: jsonb('selected_base_images'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Generation flow table
export const generationFlow = pgTable('generation_flow', {
  id: text('id').primaryKey(),
  collectionSessionId: text('collection_session_id'),
  clientId: text('client_id').notNull(),
  name: text('name').notNull(),
  productIds: jsonb('product_ids'),
  settings: jsonb('settings'),
  status: text('status').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Generated asset table
export const generatedAsset = pgTable('generated_asset', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  productId: text('product_id'),
  url: text('url').notNull(),
  sceneType: text('scene_type'),
  status: text('status').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Store connection table
export const storeConnection = pgTable('store_connection', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  provider: text('provider').notNull(),
  storeUrl: text('store_url').notNull(),
  storeName: text('store_name').notNull(),
  status: text('status').notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Export all tables as a schema object for drizzle
export const schema = {
  product,
  collectionSession,
  generationFlow,
  generatedAsset,
  storeConnection,
};
