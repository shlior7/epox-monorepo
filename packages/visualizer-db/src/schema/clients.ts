/**
 * Organization Schema
 * Tags, TagAssignment, and UserFavorite tables for content organization
 */

import { pgTable, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client, user } from './auth';

// Entity types that can have tags/favorites
export type TaggableEntityType = 'product' | 'generation_flow';
export type FavoriteEntityType = 'product' | 'generation_flow';

// ===== TAG =====
export const tag = pgTable(
  'tag',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'), // Hex color for UI display
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('tag_client_id_idx').on(table.clientId),
    unique('tag_client_name_unique').on(table.clientId, table.name),
  ]
);

// ===== TAG ASSIGNMENT (Polymorphic) =====
export const tagAssignment = pgTable(
  'tag_assignment',
  {
    id: text('id').primaryKey(),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').$type<TaggableEntityType>().notNull(),
    entityId: text('entity_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('tag_assignment_tag_id_idx').on(table.tagId),
    index('tag_assignment_entity_idx').on(table.entityType, table.entityId),
    unique('tag_assignment_unique').on(table.tagId, table.entityType, table.entityId),
  ]
);

// ===== USER FAVORITE (Polymorphic) =====
export const userFavorite = pgTable(
  'user_favorite',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').$type<FavoriteEntityType>().notNull(),
    entityId: text('entity_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('user_favorite_user_id_idx').on(table.userId),
    index('user_favorite_entity_idx').on(table.entityType, table.entityId),
    unique('user_favorite_unique').on(table.userId, table.entityType, table.entityId),
  ]
);

// ===== RELATIONS =====
export const tagRelations = relations(tag, ({ one, many }) => ({
  client: one(client, {
    fields: [tag.clientId],
    references: [client.id],
  }),
  assignments: many(tagAssignment),
}));

export const tagAssignmentRelations = relations(tagAssignment, ({ one }) => ({
  tag: one(tag, {
    fields: [tagAssignment.tagId],
    references: [tag.id],
  }),
}));

export const userFavoriteRelations = relations(userFavorite, ({ one }) => ({
  user: one(user, {
    fields: [userFavorite.userId],
    references: [user.id],
  }),
}));
