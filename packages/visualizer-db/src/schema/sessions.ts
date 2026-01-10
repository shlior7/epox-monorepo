/**
 * Sessions Schema
 * ChatSession, StudioSession (formerly ClientSession), Message, and Flow tables
 */

import { pgTable, text, timestamp, jsonb, integer, index, check } from 'drizzle-orm/pg-core';
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

// ===== STUDIO SESSION (Multi-Product, formerly ClientSession) =====
export const studioSession = pgTable(
  'studio_session',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    productIds: jsonb('product_ids').$type<string[]>().notNull().default([]),
    selectedBaseImages: jsonb('selected_base_images').$type<Record<string, string>>().notNull().default({}),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('studio_session_client_id_idx').on(table.clientId),
  ]
);

// Legacy alias
export const clientSession = studioSession;

// ===== MESSAGE =====
export const message = pgTable(
  'message',
  {
    id: text('id').primaryKey(),
    chatSessionId: text('chat_session_id').references(() => chatSession.id, { onDelete: 'cascade' }),
    studioSessionId: text('studio_session_id').references(() => studioSession.id, { onDelete: 'cascade' }),
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
    index('message_studio_session_id_idx').on(table.studioSessionId),
    // Constraint: exactly one of chatSessionId or studioSessionId must be set
    check(
      'message_session_check',
      sql`(chat_session_id IS NOT NULL AND studio_session_id IS NULL) OR (chat_session_id IS NULL AND studio_session_id IS NOT NULL)`
    ),
  ]
);

// ===== FLOW =====
export const flow = pgTable(
  'flow',
  {
    id: text('id').primaryKey(),
    studioSessionId: text('studio_session_id')
      .notNull()
      .references(() => studioSession.id, { onDelete: 'cascade' }),
    name: text('name'),
    productIds: jsonb('product_ids').$type<string[]>().notNull().default([]),
    selectedBaseImages: jsonb('selected_base_images').$type<Record<string, string>>().notNull().default({}),
    status: text('status').$type<FlowStatus>().notNull().default('empty'),
    settings: jsonb('settings').$type<FlowGenerationSettings>().notNull(),
    currentImageIndex: integer('current_image_index').notNull().default(0),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('flow_studio_session_id_idx').on(table.studioSessionId),
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

export const studioSessionRelations = relations(studioSession, ({ one, many }) => ({
  client: one(client, {
    fields: [studioSession.clientId],
    references: [client.id],
  }),
  messages: many(message),
  flows: many(flow),
}));

// Legacy alias
export const clientSessionRelations = studioSessionRelations;

export const messageRelations = relations(message, ({ one }) => ({
  chatSession: one(chatSession, {
    fields: [message.chatSessionId],
    references: [chatSession.id],
  }),
  studioSession: one(studioSession, {
    fields: [message.studioSessionId],
    references: [studioSession.id],
  }),
}));

export const flowRelations = relations(flow, ({ one }) => ({
  studioSession: one(studioSession, {
    fields: [flow.studioSessionId],
    references: [studioSession.id],
  }),
}));

export { type PostAdjustments, type FlowGenerationSettings, type FlowStatus, type MessagePart } from 'visualizer-types';
