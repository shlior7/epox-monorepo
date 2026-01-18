import { and, asc, desc, eq, ilike, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { collectionSession, generationFlow, message } from '../schema/sessions';
import type { CollectionSession, CollectionSessionCreate, CollectionSessionUpdate, CollectionSessionWithFlows, CollectionSessionStatus, GenerationFlow, Message } from 'visualizer-types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

export interface CollectionSessionListOptions {
  search?: string;
  status?: CollectionSessionStatus | 'all';
  sort?: 'recent' | 'name' | 'productCount';
  limit?: number;
  offset?: number;
}

export class CollectionSessionRepository extends BaseRepository<CollectionSession> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, collectionSession);
  }

  async create(clientId: string, data: CollectionSessionCreate): Promise<CollectionSession> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(collectionSession)
      .values({
        id,
        clientId,
        name: data.name,
        status: data.status ?? 'draft',
        productIds: data.productIds ?? [],
        selectedBaseImages: data.selectedBaseImages ?? {},
        settings: data.settings ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async upsertWithId(
    id: string,
    clientId: string,
    data: CollectionSessionCreate & { createdAt?: Date; updatedAt?: Date }
  ): Promise<CollectionSession> {
    const existing = await this.getById(id);
    const now = new Date();

    if (!existing) {
      const [created] = await this.drizzle
        .insert(collectionSession)
        .values({
          id,
          clientId,
          name: data.name,
          status: data.status ?? 'draft',
          productIds: data.productIds ?? [],
          selectedBaseImages: data.selectedBaseImages ?? {},
          settings: data.settings ?? null,
          version: 1,
          createdAt: data.createdAt ?? now,
          updatedAt: data.updatedAt ?? now,
        })
        .returning();

      return this.mapToEntity(created);
    }

    const [updated] = await this.drizzle
      .update(collectionSession)
      .set({
        name: data.name,
        status: data.status ?? existing.status,
        productIds: data.productIds ?? [],
        selectedBaseImages: data.selectedBaseImages ?? {},
        settings: data.settings ?? existing.settings,
        updatedAt: data.updatedAt ?? now,
        version: existing.version + 1,
      })
      .where(eq(collectionSession.id, id))
      .returning();

    return this.mapToEntity(updated);
  }

  async list(clientId: string): Promise<CollectionSession[]> {
    const rows = await this.drizzle
      .select()
      .from(collectionSession)
      .where(eq(collectionSession.clientId, clientId))
      .orderBy(asc(collectionSession.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getWithFlows(id: string): Promise<CollectionSessionWithFlows | null> {
    const session = await this.getById(id);
    if (!session) {
      return null;
    }

    const flows = await this.drizzle
      .select()
      .from(generationFlow)
      .where(eq(generationFlow.collectionSessionId, id))
      .orderBy(asc(generationFlow.createdAt));

    const messages = await this.drizzle
      .select()
      .from(message)
      .where(eq(message.collectionSessionId, id))
      .orderBy(asc(message.createdAt));

    return {
      ...session,
      generationFlows: flows as GenerationFlow[],
      messages: messages as Message[],
    };
  }

  async update(id: string, data: CollectionSessionUpdate, expectedVersion?: number): Promise<CollectionSession> {
    return updateWithVersion<CollectionSession>(this.drizzle, collectionSession, id, data, expectedVersion);
  }

  // ===== LIST WITH FILTERS =====

  async listWithFilters(clientId: string, options: CollectionSessionListOptions = {}): Promise<CollectionSession[]> {
    const conditions = this.buildFilterConditions(clientId, options);
    const orderByClause = this.getOrderByClause(options.sort);

    const rows = await this.drizzle
      .select()
      .from(collectionSession)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(options.limit ?? 100)
      .offset(options.offset ?? 0);

    return rows.map((row) => this.mapToEntity(row));
  }

  async countWithFilters(clientId: string, options: Omit<CollectionSessionListOptions, 'limit' | 'offset' | 'sort'> = {}): Promise<number> {
    const conditions = this.buildFilterConditions(clientId, options);

    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionSession)
      .where(and(...conditions));

    return result?.count ?? 0;
  }

  private buildFilterConditions(clientId: string, options: Omit<CollectionSessionListOptions, 'limit' | 'offset' | 'sort'>): SQL[] {
    const conditions: SQL[] = [eq(collectionSession.clientId, clientId)];

    if (options.search) {
      conditions.push(ilike(collectionSession.name, `%${options.search}%`));
    }

    if (options.status && options.status !== 'all') {
      conditions.push(eq(collectionSession.status, options.status));
    }

    return conditions;
  }

  private getOrderByClause(sort?: string) {
    switch (sort) {
      case 'name':
        return asc(collectionSession.name);
      case 'productCount':
        return desc(sql`jsonb_array_length(${collectionSession.productIds})`);
      case 'recent':
      default:
        return desc(collectionSession.updatedAt);
    }
  }

  // ===== LIST BY PRODUCT ID =====

  async listByProductId(clientId: string, productId: string, limit = 20): Promise<CollectionSession[]> {
    const rows = await this.drizzle
      .select()
      .from(collectionSession)
      .where(
        and(
          eq(collectionSession.clientId, clientId),
          sql`${collectionSession.productIds} @> ${JSON.stringify([productId])}::jsonb`
        )
      )
      .orderBy(desc(collectionSession.updatedAt))
      .limit(limit);

    return rows.map((row) => this.mapToEntity(row));
  }

  // ===== LIST RECENT =====

  async listRecent(clientId: string, limit = 3): Promise<CollectionSession[]> {
    const rows = await this.drizzle
      .select()
      .from(collectionSession)
      .where(eq(collectionSession.clientId, clientId))
      .orderBy(desc(collectionSession.updatedAt))
      .limit(limit);

    return rows.map((row) => this.mapToEntity(row));
  }

  // ===== COUNT =====

  async count(clientId: string): Promise<number> {
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionSession)
      .where(eq(collectionSession.clientId, clientId));

    return result?.count ?? 0;
  }
}
