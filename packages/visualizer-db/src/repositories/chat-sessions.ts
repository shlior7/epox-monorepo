import { asc, eq, inArray } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { chatSession, message } from '../schema/sessions';
import type { ChatSession, ChatSessionCreate, ChatSessionUpdate, ChatSessionWithMessages, Message } from '../types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

export class ChatSessionRepository extends BaseRepository<ChatSession> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, chatSession);
  }

  async create(productId: string, data: ChatSessionCreate): Promise<ChatSession> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(chatSession)
      .values({
        id,
        productId,
        name: data.name,
        selectedBaseImageId: data.selectedBaseImageId ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async upsertWithId(
    id: string,
    productId: string,
    data: ChatSessionCreate & { createdAt?: Date; updatedAt?: Date }
  ): Promise<ChatSession> {
    const existing = await this.getById(id);
    const now = new Date();

    if (!existing) {
      const [created] = await this.drizzle
        .insert(chatSession)
        .values({
          id,
          productId,
          name: data.name,
          selectedBaseImageId: data.selectedBaseImageId ?? null,
          version: 1,
          createdAt: data.createdAt ?? now,
          updatedAt: data.updatedAt ?? now,
        })
        .returning();

      return this.mapToEntity(created);
    }

    const [updated] = await this.drizzle
      .update(chatSession)
      .set({
        name: data.name,
        selectedBaseImageId: data.selectedBaseImageId ?? null,
        updatedAt: data.updatedAt ?? now,
        version: existing.version + 1,
      })
      .where(eq(chatSession.id, id))
      .returning();

    return this.mapToEntity(updated);
  }

  async list(productId: string): Promise<ChatSession[]> {
    const rows = await this.drizzle
      .select()
      .from(chatSession)
      .where(eq(chatSession.productId, productId))
      .orderBy(asc(chatSession.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByProductIds(productIds: string[]): Promise<ChatSession[]> {
    if (productIds.length === 0) {
      return [];
    }

    const rows = await this.drizzle
      .select()
      .from(chatSession)
      .where(inArray(chatSession.productId, productIds))
      .orderBy(asc(chatSession.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getWithMessages(id: string): Promise<ChatSessionWithMessages | null> {
    const session = await this.getById(id);
    if (!session) {
      return null;
    }

    const messages = await this.drizzle.select().from(message).where(eq(message.chatSessionId, id)).orderBy(asc(message.createdAt));

    return {
      ...session,
      messages: messages as Message[],
    };
  }

  async update(id: string, data: ChatSessionUpdate, expectedVersion?: number): Promise<ChatSession> {
    return updateWithVersion<ChatSession>(this.drizzle, chatSession, id, data, expectedVersion);
  }
}
