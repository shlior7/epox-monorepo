/**
 * Generated Images Schema
 * Stores metadata for AI-generated images (actual files in R2)
 */

import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client } from './auth';
import { chatSession, flow } from './sessions';
import type { FlowGenerationSettings } from 'visualizer-types';

// ===== GENERATED IMAGE =====
export const generatedImage = pgTable(
  'generated_image',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    flowId: text('flow_id').references(() => flow.id, { onDelete: 'set null' }),
    chatSessionId: text('chat_session_id').references(() => chatSession.id, { onDelete: 'set null' }),
    r2Key: text('r2_key').notNull(),
    prompt: text('prompt'),
    settings: jsonb('settings').$type<FlowGenerationSettings>(),
    productIds: jsonb('product_ids').$type<string[]>(),
    jobId: text('job_id'),
    error: text('error'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    clientIdIdx: index('generated_image_client_id_idx').on(table.clientId),
    flowIdIdx: index('generated_image_flow_id_idx').on(table.flowId),
    chatSessionIdIdx: index('generated_image_chat_session_id_idx').on(table.chatSessionId),
    createdAtIdx: index('generated_image_created_at_idx').on(table.createdAt),
    jobIdIdx: index('generated_image_job_id_idx').on(table.jobId),
  })
);

// ===== FAVORITE IMAGE =====
export const favoriteImage = pgTable(
  'favorite_image',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    generatedImageId: text('generated_image_id')
      .notNull()
      .references(() => generatedImage.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    clientIdIdx: index('favorite_image_client_id_idx').on(table.clientId),
    generatedImageIdIdx: index('favorite_image_generated_image_id_idx').on(table.generatedImageId),
  })
);

// ===== RELATIONS =====
export const generatedImageRelations = relations(generatedImage, ({ one, many }) => ({
  client: one(client, {
    fields: [generatedImage.clientId],
    references: [client.id],
  }),
  flow: one(flow, {
    fields: [generatedImage.flowId],
    references: [flow.id],
  }),
  chatSession: one(chatSession, {
    fields: [generatedImage.chatSessionId],
    references: [chatSession.id],
  }),
  favorites: many(favoriteImage),
}));

export const favoriteImageRelations = relations(favoriteImage, ({ one }) => ({
  client: one(client, {
    fields: [favoriteImage.clientId],
    references: [client.id],
  }),
  generatedImage: one(generatedImage, {
    fields: [favoriteImage.generatedImageId],
    references: [generatedImage.id],
  }),
}));
