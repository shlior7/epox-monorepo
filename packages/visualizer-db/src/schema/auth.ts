/**
 * Auth Schema - Better Auth Compatible Tables
 * These tables are managed by Better Auth but defined here for type safety
 */

import { pgTable, text, timestamp, boolean, jsonb, uniqueIndex, index, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { ClientMetadata } from 'visualizer-types';

// Re-export types for schema consumers
export type { CommerceConfig, AIModelConfig, ClientMetadata } from 'visualizer-types';

// ===== ADMIN USER (Platform Administrators) =====
export const adminUser = pgTable('admin_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

// ===== ADMIN SESSION =====
export const adminSession = pgTable(
  'admin_session',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => adminUser.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('admin_session_admin_user_id_idx').on(table.adminUserId)]
);

// ===== USER (Client Users) =====
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

// ===== SESSION =====
export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    activeClientId: text('active_client_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('session_user_id_idx').on(table.userId), index('session_active_client_id_idx').on(table.activeClientId)]
);

// ===== ACCOUNT (for OAuth providers) =====
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'date' }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'date' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)]
);

// ===== VERIFICATION =====
export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
);

// ===== CLIENT (formerly Organization) =====
export const client = pgTable(
  'client',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique(),
    logo: text('logo'),
    metadata: jsonb('metadata').$type<ClientMetadata>(),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('client_slug_idx').on(table.slug)]
);

// ===== MEMBER =====
export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('member_client_user_idx').on(table.clientId, table.userId),
    index('member_client_id_idx').on(table.clientId),
    index('member_user_id_idx').on(table.userId),
  ]
);

// ===== INVITATION =====
export const invitation = pgTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('invitation_client_id_idx').on(table.clientId), index('invitation_email_idx').on(table.email)]
);

// ===== RELATIONS =====
export const adminUserRelations = relations(adminUser, ({ many }) => ({
  sessions: many(adminSession),
}));

export const adminSessionRelations = relations(adminSession, ({ one }) => ({
  adminUser: one(adminUser, {
    fields: [adminSession.adminUserId],
    references: [adminUser.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const clientRelations = relations(client, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
}));

export const memberRelations = relations(member, ({ one }) => ({
  client: one(client, {
    fields: [member.clientId],
    references: [client.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  client: one(client, {
    fields: [invitation.clientId],
    references: [client.id],
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));
