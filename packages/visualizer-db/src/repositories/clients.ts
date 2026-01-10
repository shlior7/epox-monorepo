import { asc, eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { client } from '../schema/auth';
import type { Client, ClientCreate, ClientUpdate } from '../types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

export class ClientRepository extends BaseRepository<Client> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, client);
  }

  async create(data: ClientCreate): Promise<Client> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(client)
      .values({
        id,
        name: data.name,
        slug: data.slug ?? null,
        logo: data.logo ?? null,
        metadata: data.metadata ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async createWithId(id: string, data: ClientCreate): Promise<Client> {
    const now = new Date();

    const [created] = await this.drizzle
      .insert(client)
      .values({
        id,
        name: data.name,
        slug: data.slug ?? null,
        logo: data.logo ?? null,
        metadata: data.metadata ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async list(): Promise<Client[]> {
    const rows = await this.drizzle.select().from(client).orderBy(asc(client.createdAt));
    return rows.map((row) => this.mapToEntity(row));
  }

  async getBySlug(slug: string): Promise<Client | null> {
    const rows = await this.drizzle.select().from(client).where(eq(client.slug, slug)).limit(1);
    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async update(id: string, data: ClientUpdate, expectedVersion?: number): Promise<Client> {
    return updateWithVersion<Client>(this.drizzle, client, id, data, expectedVersion);
  }
}

// Legacy alias
export { ClientRepository as OrganizationRepository };
