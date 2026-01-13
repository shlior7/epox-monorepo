/**
 * Generated Assets Schema
 * Stores metadata for AI-generated assets (images, future: video, 3D)
 * Actual files stored in R2
 */

import { pgTable, text, timestamp, jsonb, index, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client, user } from './auth';
import { chatSession, generationFlow } from './sessions';
import { product } from './products';
import type { FlowGenerationSettings } from 'visualizer-types';

// Asset types supported
export type AssetType = 'image' | 'video' | '3d_model';
export type AssetStatus = 'pending' | 'generating' | 'completed' | 'error';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Asset analysis cached on the record
export interface AssetAnalysis {
  analyzedAt: string;
  objects?: Array<{ name: string; confidence: number; bounds?: { x: number; y: number; width: number; height: number } }>;
  colors?: { dominant: string[]; palette: string[] };
  lighting?: { type: string; direction?: string; intensity?: string };
  composition?: { style: string; focalPoints?: Array<{ x: number; y: number }> };
  masks?: Array<{ name: string; path: string }>;
  version: string;
}

// ===== GENERATED ASSET (formerly generated_image) =====
export const generatedAsset = pgTable(
  'generated_asset',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    generationFlowId: text('generation_flow_id').references(() => generationFlow.id, { onDelete: 'set null' }),
    chatSessionId: text('chat_session_id').references(() => chatSession.id, { onDelete: 'set null' }),

    // Asset storage and metadata
    assetUrl: text('asset_url').notNull(), // WebP URL for CDN (renamed from r2_key)
    assetType: text('asset_type').$type<AssetType>().notNull().default('image'),
    status: text('status').$type<AssetStatus>().notNull().default('pending'),

    // Generation metadata
    prompt: text('prompt'),
    settings: jsonb('settings').$type<FlowGenerationSettings>(),
    productIds: jsonb('product_ids').$type<string[]>(),
    jobId: text('job_id'),
    error: text('error'),

    // Cached analysis for editing (invalidated on edit)
    assetAnalysis: jsonb('asset_analysis').$type<AssetAnalysis>(),
    analysisVersion: text('analysis_version'),

    // Store sync approval
    approvalStatus: text('approval_status').$type<ApprovalStatus>().notNull().default('pending'),
    approvedAt: timestamp('approved_at', { mode: 'date' }),
    approvedBy: text('approved_by').references(() => user.id, { onDelete: 'set null' }),

    // Timestamps
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  },
  (table) => [
    index('generated_asset_client_id_idx').on(table.clientId),
    index('generated_asset_generation_flow_id_idx').on(table.generationFlowId),
    index('generated_asset_chat_session_id_idx').on(table.chatSessionId),
    index('generated_asset_created_at_idx').on(table.createdAt),
    index('generated_asset_job_id_idx').on(table.jobId),
    index('generated_asset_status_idx').on(table.status),
    index('generated_asset_approval_status_idx').on(table.clientId, table.approvalStatus),
  ]
);

// ===== GENERATED ASSET PRODUCT (Junction table for many-to-many) =====
export const generatedAssetProduct = pgTable(
  'generated_asset_product',
  {
    id: text('id').primaryKey(),
    generatedAssetId: text('generated_asset_id')
      .notNull()
      .references(() => generatedAsset.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('generated_asset_product_asset_idx').on(table.generatedAssetId),
    index('generated_asset_product_product_idx').on(table.productId),
  ]
);

// ===== FAVORITE IMAGE =====
export const favoriteImage = pgTable(
  'favorite_image',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    generatedAssetId: text('generated_asset_id')
      .notNull()
      .references(() => generatedAsset.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('favorite_image_client_id_idx').on(table.clientId),
    index('favorite_image_generated_asset_id_idx').on(table.generatedAssetId),
  ]
);

// ===== RELATIONS =====
export const generatedAssetRelations = relations(generatedAsset, ({ one, many }) => ({
  client: one(client, {
    fields: [generatedAsset.clientId],
    references: [client.id],
  }),
  generationFlow: one(generationFlow, {
    fields: [generatedAsset.generationFlowId],
    references: [generationFlow.id],
  }),
  chatSession: one(chatSession, {
    fields: [generatedAsset.chatSessionId],
    references: [chatSession.id],
  }),
  approver: one(user, {
    fields: [generatedAsset.approvedBy],
    references: [user.id],
  }),
  favorites: many(favoriteImage),
  productLinks: many(generatedAssetProduct),
}));

export const generatedAssetProductRelations = relations(generatedAssetProduct, ({ one }) => ({
  generatedAsset: one(generatedAsset, {
    fields: [generatedAssetProduct.generatedAssetId],
    references: [generatedAsset.id],
  }),
  product: one(product, {
    fields: [generatedAssetProduct.productId],
    references: [product.id],
  }),
}));

export const favoriteImageRelations = relations(favoriteImage, ({ one }) => ({
  client: one(client, {
    fields: [favoriteImage.clientId],
    references: [client.id],
  }),
  generatedAsset: one(generatedAsset, {
    fields: [favoriteImage.generatedAssetId],
    references: [generatedAsset.id],
  }),
}));
