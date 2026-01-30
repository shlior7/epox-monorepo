/**
 * Categories Schema
 * Open, user-editable category system with many-to-many product relationships
 */

import { pgTable, text, timestamp, jsonb, integer, boolean, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client } from './auth';
import { product } from './products';
import type { CategoryGenerationSettings } from 'visualizer-types';

// ===== CATEGORY =====
export const category = pgTable(
  'category',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    parentId: text('parent_id'), // Optional hierarchy

    // Category-level generation settings
    generationSettings: jsonb('generation_settings').$type<CategoryGenerationSettings>(),

    // Ordering for UI
    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('category_client_id_idx').on(table.clientId),
    uniqueIndex('category_client_slug_unique').on(table.clientId, table.slug),
    index('category_parent_id_idx').on(table.parentId),
    index('category_sort_order_idx').on(table.clientId, table.sortOrder),
  ]
);

// ===== PRODUCT CATEGORY (Many-to-Many Junction) =====
export const productCategory = pgTable(
  'product_category',
  {
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.categoryId] }),
    productIdx: index('product_category_product_idx').on(table.productId),
    categoryIdx: index('product_category_category_idx').on(table.categoryId),
    primaryIdx: index('product_category_primary_idx').on(table.productId, table.isPrimary),
  })
);

// ===== RELATIONS =====
export const categoryRelations = relations(category, ({ one, many }) => ({
  client: one(client, {
    fields: [category.clientId],
    references: [client.id],
  }),
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(category, {
    relationName: 'categoryHierarchy',
  }),
  productCategories: many(productCategory),
}));

export const productCategoryRelations = relations(productCategory, ({ one }) => ({
  product: one(product, {
    fields: [productCategory.productId],
    references: [product.id],
  }),
  category: one(category, {
    fields: [productCategory.categoryId],
    references: [category.id],
  }),
}));
