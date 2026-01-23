/**
 * Anton Schema - Collaborative Annotation System
 *
 * Workspace → Project → Page → Annotation → Reply
 * Members can be added at workspace or project level
 * Claude tasks track AI-powered fix generation
 */

import { pgTable, text, timestamp, jsonb, integer, index, boolean, decimal, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

// Type definitions for JSON columns
export interface AnnotationPosition {
  x: number;
  y: number;
  selector?: string;
}

export interface ElementContext {
  selectors: string[]; // 5-7 fallback selectors
  html: string; // Outer HTML (truncated)
  styles: Record<string, string>; // Computed styles
  screenshot?: string; // Element screenshot URL
  boundingRect: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
}

export interface ClaudeTaskContext {
  elementContext: ElementContext;
  pageUrl: string;
  annotationContent: string;
}

// ===== ANTON WORKSPACE =====
export const antonWorkspace = pgTable(
  'anton_workspace',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Free tier limits
    maxProjects: integer('max_projects').notNull().default(3),
    maxMembers: integer('max_members').notNull().default(5),

    // Premium features (for future)
    isPremium: boolean('is_premium').notNull().default(false),

    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('anton_workspace_owner_id_idx').on(table.ownerId),
  ]
);

// ===== ANTON WORKSPACE MEMBER =====
export const antonWorkspaceMember = pgTable(
  'anton_workspace_member',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => antonWorkspace.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').$type<'owner' | 'admin' | 'member' | 'viewer'>().notNull().default('member'),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('anton_workspace_member_unique_idx').on(table.workspaceId, table.userId),
    index('anton_workspace_member_workspace_id_idx').on(table.workspaceId),
    index('anton_workspace_member_user_id_idx').on(table.userId),
  ]
);

// ===== ANTON PROJECT =====
export const antonProject = pgTable(
  'anton_project',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => antonWorkspace.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),

    // URL pattern matching for auto-selection
    urlPatterns: jsonb('url_patterns').$type<string[]>().notNull().default([]),

    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('anton_project_workspace_id_idx').on(table.workspaceId),
  ]
);

// ===== ANTON PROJECT MEMBER =====
export const antonProjectMember = pgTable(
  'anton_project_member',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => antonProject.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').$type<'admin' | 'member' | 'viewer'>().notNull().default('member'),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('anton_project_member_unique_idx').on(table.projectId, table.userId),
    index('anton_project_member_project_id_idx').on(table.projectId),
    index('anton_project_member_user_id_idx').on(table.userId),
  ]
);

// ===== ANTON PAGE =====
export const antonPage = pgTable(
  'anton_page',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => antonProject.id, { onDelete: 'cascade' }),

    url: text('url').notNull(),
    normalizedUrl: text('normalized_url').notNull(), // Without query params/hash
    title: text('title'),
    thumbnail: text('thumbnail'), // Screenshot URL

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('anton_page_project_id_idx').on(table.projectId),
    index('anton_page_normalized_url_idx').on(table.normalizedUrl),
    uniqueIndex('anton_page_project_url_idx').on(table.projectId, table.normalizedUrl),
  ]
);

// ===== ANTON ANNOTATION =====
export const antonAnnotation = pgTable(
  'anton_annotation',
  {
    id: text('id').primaryKey(),
    pageId: text('page_id')
      .notNull()
      .references(() => antonPage.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => antonProject.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    content: text('content').notNull(),

    // Position data (legacy format for backward compatibility)
    position: jsonb('position').$type<AnnotationPosition>().notNull(),

    // Enhanced element capture
    elementSelectors: jsonb('element_selectors').$type<string[]>(), // 5-7 fallback selectors
    screenLocationX: decimal('screen_location_x', { precision: 10, scale: 6 }), // Viewport % (0-100)
    screenLocationY: decimal('screen_location_y', { precision: 10, scale: 6 }), // Viewport % (0-100)

    // Element context for Claude
    elementHtml: text('element_html'), // Truncated HTML
    elementStyles: jsonb('element_styles').$type<Record<string, string>>(), // Computed styles
    elementScreenshot: text('element_screenshot'), // R2 URL
    elementBoundingRect: jsonb('element_bounding_rect').$type<{ width: number; height: number; top: number; left: number }>(),

    // Status
    isResolved: boolean('is_resolved').notNull().default(false),
    resolvedAt: timestamp('resolved_at', { mode: 'date' }),
    resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),

    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('anton_annotation_page_id_idx').on(table.pageId),
    index('anton_annotation_project_id_idx').on(table.projectId),
    index('anton_annotation_author_id_idx').on(table.authorId),
    index('anton_annotation_resolved_idx').on(table.isResolved),
  ]
);

// ===== ANTON ANNOTATION REPLY =====
export const antonAnnotationReply = pgTable(
  'anton_annotation_reply',
  {
    id: text('id').primaryKey(),
    annotationId: text('annotation_id')
      .notNull()
      .references(() => antonAnnotation.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    content: text('content').notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('anton_annotation_reply_annotation_id_idx').on(table.annotationId),
    index('anton_annotation_reply_author_id_idx').on(table.authorId),
  ]
);

// ===== ANTON CLAUDE TASK =====
export const antonClaudeTask = pgTable(
  'anton_claude_task',
  {
    id: text('id').primaryKey(),
    annotationId: text('annotation_id')
      .notNull()
      .references(() => antonAnnotation.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => antonProject.id, { onDelete: 'cascade' }),

    claudeTaskId: text('claude_task_id'), // Claude API task ID
    prompt: text('prompt').notNull(),
    context: jsonb('context').$type<ClaudeTaskContext>().notNull(),

    status: text('status').$type<'sent' | 'in_progress' | 'completed' | 'failed'>().notNull().default('sent'),
    response: text('response'), // Claude's response
    errorMessage: text('error_message'),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('anton_claude_task_annotation_id_idx').on(table.annotationId),
    index('anton_claude_task_project_id_idx').on(table.projectId),
    index('anton_claude_task_status_idx').on(table.status),
  ]
);

// ===== RELATIONS =====

export const antonWorkspaceRelations = relations(antonWorkspace, ({ one, many }) => ({
  owner: one(user, {
    fields: [antonWorkspace.ownerId],
    references: [user.id],
  }),
  members: many(antonWorkspaceMember),
  projects: many(antonProject),
}));

export const antonWorkspaceMemberRelations = relations(antonWorkspaceMember, ({ one }) => ({
  workspace: one(antonWorkspace, {
    fields: [antonWorkspaceMember.workspaceId],
    references: [antonWorkspace.id],
  }),
  user: one(user, {
    fields: [antonWorkspaceMember.userId],
    references: [user.id],
  }),
}));

export const antonProjectRelations = relations(antonProject, ({ one, many }) => ({
  workspace: one(antonWorkspace, {
    fields: [antonProject.workspaceId],
    references: [antonWorkspace.id],
  }),
  members: many(antonProjectMember),
  pages: many(antonPage),
  annotations: many(antonAnnotation),
  claudeTasks: many(antonClaudeTask),
}));

export const antonProjectMemberRelations = relations(antonProjectMember, ({ one }) => ({
  project: one(antonProject, {
    fields: [antonProjectMember.projectId],
    references: [antonProject.id],
  }),
  user: one(user, {
    fields: [antonProjectMember.userId],
    references: [user.id],
  }),
}));

export const antonPageRelations = relations(antonPage, ({ one, many }) => ({
  project: one(antonProject, {
    fields: [antonPage.projectId],
    references: [antonProject.id],
  }),
  annotations: many(antonAnnotation),
}));

export const antonAnnotationRelations = relations(antonAnnotation, ({ one, many }) => ({
  page: one(antonPage, {
    fields: [antonAnnotation.pageId],
    references: [antonPage.id],
  }),
  project: one(antonProject, {
    fields: [antonAnnotation.projectId],
    references: [antonProject.id],
  }),
  author: one(user, {
    fields: [antonAnnotation.authorId],
    references: [user.id],
  }),
  resolver: one(user, {
    fields: [antonAnnotation.resolvedBy],
    references: [user.id],
  }),
  replies: many(antonAnnotationReply),
  claudeTasks: many(antonClaudeTask),
}));

export const antonAnnotationReplyRelations = relations(antonAnnotationReply, ({ one }) => ({
  annotation: one(antonAnnotation, {
    fields: [antonAnnotationReply.annotationId],
    references: [antonAnnotation.id],
  }),
  author: one(user, {
    fields: [antonAnnotationReply.authorId],
    references: [user.id],
  }),
}));

export const antonClaudeTaskRelations = relations(antonClaudeTask, ({ one }) => ({
  annotation: one(antonAnnotation, {
    fields: [antonClaudeTask.annotationId],
    references: [antonAnnotation.id],
  }),
  project: one(antonProject, {
    fields: [antonClaudeTask.projectId],
    references: [antonProject.id],
  }),
}));
