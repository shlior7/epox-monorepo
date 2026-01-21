import { and, eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { account } from '../schema/auth';
import { BaseRepository } from './base';

export interface Account {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AccountRepository extends BaseRepository<Account> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, account);
  }

  async listByUser(userId: string): Promise<Account[]> {
    const rows = await this.drizzle.select().from(account).where(eq(account.userId, userId));
    return rows.map((row) => this.mapToEntity(row));
  }

  async getByProviderAndUser(userId: string, providerId: string): Promise<Account | null> {
    const rows = await this.drizzle
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, providerId)))
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async upsertPasswordForProvider(userId: string, providerId: string, passwordHash: string): Promise<Account> {
    const now = new Date();
    const existing = await this.getByProviderAndUser(userId, providerId);

    if (existing) {
      const [updated] = await this.drizzle
        .update(account)
        .set({
          password: passwordHash,
          updatedAt: now,
        })
        .where(eq(account.id, existing.id))
        .returning();

      return this.mapToEntity(updated);
    }

    const id = this.generateId();
    const [created] = await this.drizzle
      .insert(account)
      .values({
        id,
        userId,
        accountId: userId,
        providerId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }
}
