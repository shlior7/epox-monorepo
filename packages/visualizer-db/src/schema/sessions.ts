/**
 * Sessions Schema
 * ChatSession, CollectionSession (formerly StudioSession), Message, and GenerationFlow tables
 */

import { pgTable, text, timestamp, jsonb, integer, index, check, boolean } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { client } from './auth';
import { product } from './products';
import type { FlowGenerationSettings, FlowStatus, MessagePart } from 'visualizer-types';

// Re-export types for schema consumers

// ===== CHAT SESSION (Single Product) =====
export const chatSession = pgTable(
  'chat_session',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    selectedBaseImageId: text('selected_base_image_id'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('chat_session_product_id_idx').on(table.productId),
  ]
);

// ===== COLLECTION SESSION (Multi-Product, formerly StudioSession) =====
export const collectionSession = pgTable(
  'collection_session',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: text('status').$type<'draft' | 'generating' | 'completed'>().notNull().default('draft'),
    productIds: jsonb('product_ids').$type<string[]>().notNull().default([]),
    selectedBaseImages: jsonb('selected_base_images').$type<Record<string, string>>().notNull().default({}),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('collection_session_client_id_idx').on(table.clientId),
  ]
);

// ===== MESSAGE =====
export const message = pgTable(
  'message',
  {
    id: text('id').primaryKey(),
    chatSessionId: text('chat_session_id').references(() => chatSession.id, { onDelete: 'cascade' }),
    collectionSessionId: text('collection_session_id').references(() => collectionSession.id, { onDelete: 'cascade' }),
    role: text('role').$type<'user' | 'assistant'>().notNull(),
    parts: jsonb('parts').$type<MessagePart[]>().notNull(),
    baseImageId: text('base_image_id'),
    baseImageIds: jsonb('base_image_ids').$type<Record<string, string>>(),
    inspirationImageId: text('inspiration_image_id'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('message_chat_session_id_idx').on(table.chatSessionId),
    index('message_collection_session_id_idx').on(table.collectionSessionId),
    // Constraint: exactly one of chatSessionId or collectionSessionId must be set
    check(
      'message_session_check',
      sql`(chat_session_id IS NOT NULL AND collection_session_id IS NULL) OR (chat_session_id IS NULL AND collection_session_id IS NOT NULL)`
    ),
  ]
);

// ===== GENERATION FLOW (formerly Flow) =====
export const generationFlow = pgTable(
  'generation_flow',
  {
    id: text('id').primaryKey(),
    // NULLABLE - allows standalone flows without a collection session
    collectionSessionId: text('collection_session_id')
      .references(() => collectionSession.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    name: text('name'),
    productIds: jsonb('product_ids').$type<string[]>().notNull().default([]),
    selectedBaseImages: jsonb('selected_base_images').$type<Record<string, string>>().notNull().default({}),
    status: text('status').$type<FlowStatus>().notNull().default('empty'),
    settings: jsonb('settings').$type<FlowGenerationSettings>().notNull(),
    isFavorite: boolean('is_favorite').notNull().default(false),
    currentImageIndex: integer('current_image_index').notNull().default(0),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('generation_flow_collection_session_id_idx').on(table.collectionSessionId),
    index('generation_flow_client_id_idx').on(table.clientId),
    index('generation_flow_status_idx').on(table.status),
    index('generation_flow_favorite_idx').on(table.clientId, table.isFavorite),
  ]
);

// ===== RELATIONS =====
export const chatSessionRelations = relations(chatSession, ({ one, many }) => ({
  product: one(product, {
    fields: [chatSession.productId],
    references: [product.id],
  }),
  messages: many(message),
}));

export const collectionSessionRelations = relations(collectionSession, ({ one, many }) => ({
  client: one(client, {
    fields: [collectionSession.clientId],
    references: [client.id],
  }),
  messages: many(message),
  generationFlows: many(generationFlow),
}));

export const messageRelations = relations(message, ({ one }) => ({
  chatSession: one(chatSession, {
    fields: [message.chatSessionId],
    references: [chatSession.id],
  }),
  collectionSession: one(collectionSession, {
    fields: [message.collectionSessionId],
    references: [collectionSession.id],
  }),
}));

export const generationFlowRelations = relations(generationFlow, ({ one }) => ({
  collectionSession: one(collectionSession, {
    fields: [generationFlow.collectionSessionId],
    references: [collectionSession.id],
  }),
  client: one(client, {
    fields: [generationFlow.clientId],
    references: [client.id],
  }),
}));

export { type PostAdjustments, type FlowGenerationSettings, type FlowStatus, type MessagePart } from 'visualizer-types';
