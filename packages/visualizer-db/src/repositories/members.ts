import { and, eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { member } from '../schema/auth';
import type { Member } from '../types';
import { BaseRepository } from './base';

export class MemberRepository extends BaseRepository<Member> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, member);
  }

  async create(clientId: string, userId: string, role?: string): Promise<Member> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(member)
      .values({
        id,
        clientId,
        userId,
        role: role ?? 'member',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async listByClient(clientId: string): Promise<Member[]> {
    const rows = await this.drizzle.select().from(member).where(eq(member.clientId, clientId));
    return rows.map((row) => this.mapToEntity(row));
  }

  async listByOrganization(organizationId: string): Promise<Member[]> {
    return this.listByClient(organizationId);
  }

  async listByUser(userId: string): Promise<Member[]> {
    const rows = await this.drizzle.select().from(member).where(eq(member.userId, userId));
    return rows.map((row) => this.mapToEntity(row));
  }

  async getByClientAndUser(clientId: string, userId: string): Promise<Member | null> {
    const rows = await this.drizzle
      .select()
      .from(member)
      .where(and(eq(member.clientId, clientId), eq(member.userId, userId)))
      .limit(1);
    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async getByOrganizationAndUser(organizationId: string, userId: string): Promise<Member | null> {
    return this.getByClientAndUser(organizationId, userId);
  }
}
