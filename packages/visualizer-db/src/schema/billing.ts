/**
 * Billing Schema
 * Subscription plans, subscriptions, billing transactions, and credit packs
 */

import { pgTable, text, timestamp, integer, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { client } from './auth';

// ===== SUBSCRIPTION PLANS =====
// Plan definitions with pricing and included credits

export const subscriptionPlans = pgTable('subscription_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  monthlyPriceUsd: integer('monthly_price_usd').notNull(), // in USD cents
  annualPriceUsd: integer('annual_price_usd').notNull(), // in USD cents
  monthlyCredits: integer('monthly_credits').notNull(),
  maxProducts: integer('max_products').notNull(), // -1 for unlimited
  features: jsonb('features'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

// ===== SUBSCRIPTIONS =====
// Active client subscriptions

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused';
export type BillingCycle = 'monthly' | 'annual';

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .unique()
      .references(() => client.id, { onDelete: 'cascade' }),
    planId: text('plan_id')
      .notNull()
      .references(() => subscriptionPlans.id),
    status: text('status').$type<SubscriptionStatus>().notNull(),
    billingCycle: text('billing_cycle').$type<BillingCycle>().notNull(),
    currentPeriodStart: timestamp('current_period_start', { mode: 'date' }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }).notNull(),
    canceledAt: timestamp('canceled_at', { mode: 'date' }),
    cancelAtPeriodEnd: integer('cancel_at_period_end').notNull().default(0),
    tranzilaToken: text('tranzila_token'),
    tokenExpDate: text('token_exp_date'), // MMYY format
    last4Digits: text('last_4_digits'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('subscriptions_client_id_idx').on(table.clientId),
    index('subscriptions_plan_id_idx').on(table.planId),
    index('subscriptions_status_idx').on(table.status),
  ]
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  client: one(client, {
    fields: [subscriptions.clientId],
    references: [client.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
}));

// ===== BILLING TRANSACTIONS =====
// All payment records

export type TransactionType = 'subscription_payment' | 'credit_pack' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export const billingTransactions = pgTable(
  'billing_transactions',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    subscriptionId: text('subscription_id').references(() => subscriptions.id),
    type: text('type').$type<TransactionType>().notNull(),
    amountUsd: integer('amount_usd').notNull(), // in USD cents
    currency: text('currency').notNull().default('USD'),
    creditsGranted: integer('credits_granted').notNull(),
    status: text('status').$type<TransactionStatus>().notNull(),
    tranzilaConfirmation: text('tranzila_confirmation'),
    tranzilaIndex: text('tranzila_index'),
    description: text('description').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('billing_transactions_client_id_idx').on(table.clientId),
    index('billing_transactions_subscription_id_idx').on(table.subscriptionId),
    index('billing_transactions_type_idx').on(table.type),
    index('billing_transactions_created_at_idx').on(table.createdAt),
  ]
);

export const billingTransactionsRelations = relations(billingTransactions, ({ one }) => ({
  client: one(client, {
    fields: [billingTransactions.clientId],
    references: [client.id],
  }),
  subscription: one(subscriptions, {
    fields: [billingTransactions.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// ===== CREDIT PACKS =====
// One-time credit pack definitions

export const creditPacks = pgTable('credit_packs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  credits: integer('credits').notNull(),
  priceUsd: integer('price_usd').notNull(), // in USD cents
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});
