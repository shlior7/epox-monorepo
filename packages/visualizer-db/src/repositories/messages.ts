import { asc, eq, inArray } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { message } from '../schema/sessions';
import type { Message, MessageCreate, MessageUpdate, SessionType } from 'visualizer-types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

export type MessageSessionType = SessionType;

type MessageInsert = MessageCreate & { id: string; createdAt?: Date; updatedAt?: Date };

export class MessageRepository extends BaseRepository<Message> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, message);
  }

  async create(sessionId: string, type: MessageSessionType, data: MessageCreate): Promise<Message> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(message)
      .values({
        id,
        chatSessionId: type === 'chat' ? sessionId : null,
        collectionSessionId: type === 'collection' ? sessionId : null,
        role: data.role,
        parts: data.parts,
        baseImageIds: data.baseImageIds ?? null,
        inspirationImageId: data.inspirationImageId ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async list(sessionId: string, type: MessageSessionType): Promise<Message[]> {
    const condition = type === 'chat' ? eq(message.chatSessionId, sessionId) : eq(message.collectionSessionId, sessionId);
    const rows = await this.drizzle.select().from(message).where(condition).orderBy(asc(message.createdAt));
    return rows.map((row) => this.mapToEntity(row));
  }

  async listBySessionIds(sessionIds: string[], type: MessageSessionType): Promise<Message[]> {
    if (sessionIds.length === 0) {
      return [];
    }

    const condition =
      type === 'chat' ? inArray(message.chatSessionId, sessionIds) : inArray(message.collectionSessionId, sessionIds);
    const rows = await this.drizzle.select().from(message).where(condition).orderBy(asc(message.createdAt));
    return rows.map((row) => this.mapToEntity(row));
  }

  async deleteBySession(sessionId: string, type: MessageSessionType): Promise<void> {
    const condition = type === 'chat' ? eq(message.chatSessionId, sessionId) : eq(message.collectionSessionId, sessionId);
    await this.drizzle.delete(message).where(condition);
  }

  async update(id: string, data: MessageUpdate, expectedVersion?: number): Promise<Message> {
    return updateWithVersion<Message>(this.drizzle, message, id, data, expectedVersion);
  }

  async createBatch(sessionId: string, type: MessageSessionType, messages: MessageCreate[]): Promise<Message[]> {
    if (messages.length === 0) return [];

    const now = new Date();
    const rows = await this.drizzle
      .insert(message)
      .values(
        messages.map((entry) => ({
          id: this.generateId(),
          chatSessionId: type === 'chat' ? sessionId : null,
          collectionSessionId: type === 'collection' ? sessionId : null,
          role: entry.role,
          parts: entry.parts,
          baseImageIds: entry.baseImageIds ?? null,
          inspirationImageId: entry.inspirationImageId ?? null,
          version: 1,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async createBatchWithIds(sessionId: string, type: MessageSessionType, messages: MessageInsert[]): Promise<Message[]> {
    if (messages.length === 0) return [];

    const now = new Date();
    const rows = await this.drizzle
      .insert(message)
      .values(
        messages.map((entry) => ({
          id: entry.id,
          chatSessionId: type === 'chat' ? sessionId : null,
          collectionSessionId: type === 'collection' ? sessionId : null,
          role: entry.role,
          parts: entry.parts,
          baseImageIds: entry.baseImageIds ?? null,
          inspirationImageId: entry.inspirationImageId ?? null,
          version: 1,
          createdAt: entry.createdAt ?? now,
          updatedAt: entry.updatedAt ?? entry.createdAt ?? now,
        }))
      )
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async replaceForSession(sessionId: string, type: MessageSessionType, messages: MessageInsert[]): Promise<Message[]> {
    await this.deleteBySession(sessionId, type);
    return this.createBatchWithIds(sessionId, type, messages);
  }
}
