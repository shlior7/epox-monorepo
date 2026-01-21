/**
 * Analytics Schema
 * Generation events for tracking and insights
 */

import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client } from './auth';
import { generationFlow } from './sessions';
import { product } from './products';

// Event types
export type GenerationEventType = 'started' | 'completed' | 'error' | 'viewed';

// ===== GENERATION EVENT =====
export const generationEvent = pgTable(
  'generation_event',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    generationFlowId: text('generation_flow_id').references(() => generationFlow.id, { onDelete: 'set null' }),
    productId: text('product_id').references(() => product.id, { onDelete: 'set null' }),
    eventType: text('event_type').$type<GenerationEventType>().notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('generation_event_client_id_idx').on(table.clientId),
    index('generation_event_type_idx').on(table.eventType),
    index('generation_event_created_at_idx').on(table.createdAt),
    index('generation_event_flow_id_idx').on(table.generationFlowId),
  ]
);

// ===== RELATIONS =====
export const generationEventRelations = relations(generationEvent, ({ one }) => ({
  client: one(client, {
    fields: [generationEvent.clientId],
    references: [client.id],
  }),
  generationFlow: one(generationFlow, {
    fields: [generationEvent.generationFlowId],
    references: [generationFlow.id],
  }),
  product: one(product, {
    fields: [generationEvent.productId],
    references: [product.id],
  }),
}));
