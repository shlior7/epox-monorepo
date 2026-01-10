/**
 * Products Schema
 * Product and ProductImage tables
 */

import { pgTable, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client } from './auth';

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
    favoriteImages: jsonb('favorite_images').$type<Array<{ imageId: string; sessionId: string }>>().notNull().default([]),
    sceneImages: jsonb('scene_images').$type<Array<{ imageId: string; sessionId: string }>>().notNull().default([]),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('product_client_id_idx').on(table.clientId)]
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
