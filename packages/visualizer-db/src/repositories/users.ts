import { eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { NotFoundError } from '../errors';
import { user } from '../schema/auth';
import type { User } from '../types';
import { BaseRepository } from './base';

export class UserRepository extends BaseRepository<User> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, user);
  }

  async create(params: { email: string; name: string; emailVerified?: boolean; image?: string | null }): Promise<User> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(user)
      .values({
        id,
        email: params.email,
        name: params.name,
        emailVerified: params.emailVerified ?? false,
        image: params.image ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async getByEmail(email: string): Promise<User | null> {
    const rows = await this.drizzle.select().from(user).where(eq(user.email, email)).limit(1);
    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async update(id: string, data: Partial<Pick<User, 'email' | 'name' | 'emailVerified' | 'image'>>): Promise<User> {
    const updatePayload: Record<string, unknown> = {};
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.emailVerified !== undefined) updatePayload.emailVerified = data.emailVerified;
    if (data.image !== undefined) updatePayload.image = data.image;

    if (Object.keys(updatePayload).length === 0) {
      const existing = await this.getById(id);
      if (!existing) {
        throw new NotFoundError('user', id);
      }
      return existing;
    }

    updatePayload.updatedAt = new Date();

    const [updated] = await this.drizzle.update(user).set(updatePayload).where(eq(user.id, id)).returning();
    if (!updated) {
      throw new NotFoundError('user', id);
    }

    return this.mapToEntity(updated);
  }
}
