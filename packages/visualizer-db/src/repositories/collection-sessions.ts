import { asc, eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { collectionSession, generationFlow, message } from '../schema/sessions';
import type { CollectionSession, CollectionSessionCreate, CollectionSessionUpdate, CollectionSessionWithFlows, GenerationFlow, Message } from 'visualizer-types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

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
}
