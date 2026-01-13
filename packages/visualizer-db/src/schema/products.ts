/**
 * Products Schema
 * Product and ProductImage tables
 */

import { pgTable, text, timestamp, jsonb, integer, index, boolean, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client } from './auth';

// Product source type
export type ProductSource = 'imported' | 'uploaded';

// Product analysis data for prompt engineering
export interface ProductAnalysis {
  analyzedAt: string;
  productType: string;
  materials: string[];
  colors: { primary: string; accent?: string[] };
  style: string[];
  suggestedRoomTypes: string[];
  scaleHints: { width: string; height: string };
  promptKeywords: string[];
  version: string;
}

// ===== PRODUCT =====
export const product = pgTable(
  'product',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    roomTypes: jsonb('room_types').$type<string[]>(),
    modelFilename: text('model_filename'),

    // Favorites tracking
    isFavorite: boolean('is_favorite').notNull().default(false),

    // Product source (determines available actions)
    source: text('source').$type<ProductSource>().notNull().default('uploaded'),

    // Store import fields (for bidirectional sync - only for source='imported')
    storeConnectionId: text('store_connection_id'),
    erpId: text('erp_id'),              // Original product ID in store
    erpSku: text('erp_sku'),            // Store SKU
    erpUrl: text('erp_url'),            // Product URL in store
    importedAt: timestamp('imported_at', { mode: 'date' }),

    // Product analysis (for prompt engineering)
    analysisData: jsonb('analysis_data').$type<ProductAnalysis>(),
    analysisVersion: text('analysis_version'),
    analyzedAt: timestamp('analyzed_at', { mode: 'date' }),

    // Price and metadata
    price: decimal('price', { precision: 10, scale: 2 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Legacy fields (keep for backward compatibility)
    favoriteImages: jsonb('favorite_images').$type<Array<{ imageId: string; sessionId: string }>>().notNull().default([]),
    sceneImages: jsonb('scene_images').$type<Array<{ imageId: string; sessionId: string }>>().notNull().default([]),

    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('product_client_id_idx').on(table.clientId),
    index('product_favorite_idx').on(table.clientId, table.isFavorite),
    index('product_source_idx').on(table.clientId, table.source),
    index('product_erp_idx').on(table.storeConnectionId, table.erpId),
    index('product_analyzed_idx').on(table.clientId, table.analyzedAt),
  ]
);

// ===== PRODUCT IMAGE =====
export const productImage = pgTable(
  'product_image',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    r2KeyBase: text('r2_key_base').notNull(),
    r2KeyPreview: text('r2_key_preview'),
    sortOrder: integer('sort_order').notNull().default(0),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('product_image_product_id_idx').on(table.productId),
    index('product_image_sort_order_idx').on(table.productId, table.sortOrder),
  ]
);

// ===== RELATIONS =====
export const productRelations = relations(product, ({ one, many }) => ({
  client: one(client, {
    fields: [product.clientId],
    references: [client.id],
  }),
  images: many(productImage),
}));

export const productImageRelations = relations(productImage, ({ one }) => ({
  product: one(product, {
    fields: [productImage.productId],
    references: [product.id],
  }),
}));
