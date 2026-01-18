/**
 * Usage/Quota Schema
 * Tracks generation usage and quota limits per client
 */

import { pgTable, text, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client, user } from './auth';

// ===== USAGE RECORD =====
// Tracks monthly generation usage

export const usageRecord = pgTable(
  'usage_record',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    // Format: YYYY-MM (e.g., "2026-01")
    month: text('month').notNull(),
    generationCount: integer('generation_count').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('usage_record_client_month_idx').on(table.clientId, table.month),
    index('usage_record_user_month_idx').on(table.userId, table.month),
  ]
);

export const usageRecordRelations = relations(usageRecord, ({ one }) => ({
  client: one(client, {
    fields: [usageRecord.clientId],
    references: [client.id],
  }),
  user: one(user, {
    fields: [usageRecord.userId],
    references: [user.id],
  }),
}));

// ===== QUOTA LIMIT =====
// Defines quota limits per client based on plan

export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

export const quotaLimit = pgTable(
  'quota_limit',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .unique()
      .references(() => client.id, { onDelete: 'cascade' }),
    plan: text('plan').$type<PlanType>().notNull().default('free'),
    monthlyGenerationLimit: integer('monthly_generation_limit').notNull().default(100),
    storageQuotaMb: integer('storage_quota_mb').notNull().default(1000),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('quota_limit_client_id_idx').on(table.clientId)]
);

export const quotaLimitRelations = relations(quotaLimit, ({ one }) => ({
  client: one(client, {
    fields: [quotaLimit.clientId],
    references: [client.id],
  }),
}));


