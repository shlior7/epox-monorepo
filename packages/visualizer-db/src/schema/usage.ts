/**
 * Usage/Quota Schema
 * Tracks generation usage and quota limits per client
 */

import { pgTable, text, timestamp, integer, index, uniqueIndex, real, jsonb } from 'drizzle-orm/pg-core';
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

// ===== AI COST TRACKING =====
// Tracks detailed cost per AI operation for billing and monitoring

export type AIOperationType = 'image_generation' | 'image_edit' | 'video_generation' | 'vision_analysis' | 'product_analysis';

export const aiCostTracking = pgTable(
  'ai_cost_tracking',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    requestId: text('request_id'), // From logger context
    jobId: text('job_id'), // If related to generation job
    operationType: text('operation_type').$type<AIOperationType>().notNull(),
    model: text('model').notNull(), // e.g., 'gemini-2.5-flash-image'
    provider: text('provider').notNull().default('google-gemini'),
    costUsdCents: integer('cost_usd_cents').notNull(), // Cost in USD cents (e.g., 100 = $1.00)
    inputTokens: integer('input_tokens'), // For text models
    outputTokens: integer('output_tokens'), // For text models
    imageCount: integer('image_count'), // For image operations
    videoDurationSeconds: integer('video_duration_seconds'), // For video
    metadata: jsonb('metadata'), // Additional operation details
    success: integer('success').notNull().default(1), // 1 = success, 0 = failed
    errorMessage: text('error_message'), // If failed
    durationMs: integer('duration_ms'), // Operation duration
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('ai_cost_tracking_client_created_idx').on(table.clientId, table.createdAt),
    index('ai_cost_tracking_user_created_idx').on(table.userId, table.createdAt),
    index('ai_cost_tracking_request_id_idx').on(table.requestId),
    index('ai_cost_tracking_job_id_idx').on(table.jobId),
  ]
);

export const aiCostTrackingRelations = relations(aiCostTracking, ({ one }) => ({
  client: one(client, {
    fields: [aiCostTracking.clientId],
    references: [client.id],
  }),
  user: one(user, {
    fields: [aiCostTracking.userId],
    references: [user.id],
  }),
}));

// ===== CREDIT AUDIT LOG =====
// Tracks admin credit management actions for audit trail

export type AuditAction = 'plan_change' | 'credit_grant' | 'limit_change' | 'usage_reset';

export const creditAuditLog = pgTable(
  'credit_audit_log',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    adminId: text('admin_id').notNull(),
    action: text('action').$type<AuditAction>().notNull(),
    details: jsonb('details'),
    previousValue: text('previous_value'),
    newValue: text('new_value'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('credit_audit_log_client_created_idx').on(table.clientId, table.createdAt),
  ]
);

export const creditAuditLogRelations = relations(creditAuditLog, ({ one }) => ({
  client: one(client, {
    fields: [creditAuditLog.clientId],
    references: [client.id],
  }),
}));
