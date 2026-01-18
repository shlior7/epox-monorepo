/**
 * Generation Jobs Schema
 * PostgreSQL-based job queue for image generation
 */

import { relations } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { client } from './auth';
import { generationFlow } from './sessions';

// ============================================================================
// TYPES
// ============================================================================

export type JobType = 'image_generation' | 'image_edit';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface PromptTags {
  sceneType: string[];
  mood: string[];
  lighting: string[];
  style: string[];
  custom: string[];
}

export interface ImageGenerationPayload {
  prompt: string;
  productIds: string[];
  sessionId: string;
  settings?: {
    aspectRatio?: string;
    imageQuality?: string;
    numberOfVariants?: number;
  };
  /** Prompt tags selected in the config panel */
  promptTags?: PromptTags;
  /** User-provided custom prompt text */
  customPrompt?: string;
  productImageId?: string;
  productImageIds?: Array<{ productId: string; imageId: string }>;
  /** Selected product image URLs (one per product) */
  productImageUrls?: string[];
  inspirationImageId?: string;
  inspirationImageUrl?: string;
  /** Inspiration/reference image URLs */
  inspirationImageUrls?: string[];
  isClientSession?: boolean;
  modelOverrides?: {
    imageModel?: string;
    fallbackImageModel?: string;
  };
}

export interface ImageEditPayload {
  sourceImageUrl: string;
  editPrompt: string;
  sessionId: string;
  productIds?: string[];
  referenceImages?: Array<{ url: string; componentName: string }>;
}

export interface JobResult {
  imageUrls: string[];
  imageIds: string[];
  duration?: number;
}

// ============================================================================
// SCHEMA
// ============================================================================

export const generationJob = pgTable(
  'generation_job',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `job_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`),

    // References
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    flowId: text('flow_id').references(() => generationFlow.id, { onDelete: 'set null' }),

    // Job type and payload
    type: text('type').$type<JobType>().notNull(),
    payload: jsonb('payload').$type<ImageGenerationPayload | ImageEditPayload>().notNull(),

    // Status
    status: text('status').$type<JobStatus>().notNull().default('pending'),
    progress: integer('progress').notNull().default(0),

    // Results
    result: jsonb('result').$type<JobResult>(),
    error: text('error'),

    // Retry handling
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // Worker tracking (prevents double-processing)
    lockedBy: text('locked_by'),
    lockedAt: timestamp('locked_at', { withTimezone: true, mode: 'date' }),

    // Priority (lower = higher priority)
    priority: integer('priority').notNull().default(100),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    // Index for claiming pending jobs efficiently
    index('idx_generation_job_claimable').on(table.priority, table.createdAt),
    // Index for job lookup by flow
    index('idx_generation_job_flow').on(table.flowId),
    // Index for client's jobs
    index('idx_generation_job_client').on(table.clientId, table.createdAt),
    // Index for status queries
    index('idx_generation_job_status').on(table.status),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const generationJobRelations = relations(generationJob, ({ one }) => ({
  client: one(client, {
    fields: [generationJob.clientId],
    references: [client.id],
  }),
  flow: one(generationFlow, {
    fields: [generationJob.flowId],
    references: [generationFlow.id],
  }),
}));
