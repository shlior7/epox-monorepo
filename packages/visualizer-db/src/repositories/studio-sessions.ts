import { asc, eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { studioSession, flow, message } from '../schema/sessions';
import type { StudioSession, StudioSessionCreate, StudioSessionUpdate, StudioSessionWithFlows, Flow, Message } from '../types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

export class StudioSessionRepository extends BaseRepository<StudioSession> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, studioSession);
  }

  async create(clientId: string, data: StudioSessionCreate): Promise<StudioSession> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(studioSession)
      .values({
        id,
        clientId,
        name: data.name,
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
    data: StudioSessionCreate & { createdAt?: Date; updatedAt?: Date }
  ): Promise<StudioSession> {
    const existing = await this.getById(id);
    const now = new Date();

    if (!existing) {
      const [created] = await this.drizzle
        .insert(studioSession)
        .values({
          id,
          clientId,
          name: data.name,
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
      .update(studioSession)
      .set({
        name: data.name,
        productIds: data.productIds ?? [],
        selectedBaseImages: data.selectedBaseImages ?? {},
        updatedAt: data.updatedAt ?? now,
        version: existing.version + 1,
      })
      .where(eq(studioSession.id, id))
      .returning();

    return this.mapToEntity(updated);
  }

  async list(clientId: string): Promise<StudioSession[]> {
    const rows = await this.drizzle
      .select()
      .from(studioSession)
      .where(eq(studioSession.clientId, clientId))
      .orderBy(asc(studioSession.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getWithFlows(id: string): Promise<StudioSessionWithFlows | null> {
    const session = await this.getById(id);
    if (!session) {
      return null;
    }

    const flows = await this.drizzle.select().from(flow).where(eq(flow.studioSessionId, id)).orderBy(asc(flow.createdAt));

    const messages = await this.drizzle.select().from(message).where(eq(message.studioSessionId, id)).orderBy(asc(message.createdAt));

    return {
      ...session,
      flows: flows as Flow[],
      messages: messages as Message[],
    };
  }

  async update(id: string, data: StudioSessionUpdate, expectedVersion?: number): Promise<StudioSession> {
    return updateWithVersion<StudioSession>(this.drizzle, studioSession, id, data, expectedVersion);
  }
}

// Legacy alias
export { StudioSessionRepository as ClientSessionRepository };
