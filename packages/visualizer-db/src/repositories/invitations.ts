import { and, eq, gt, lt } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { invitation } from '../schema/auth';
import { NotFoundError } from '../errors';
import { BaseRepository } from './base';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  clientId: string;
  email: string;
  role: string | null;
  status: InvitationStatus;
  expiresAt: Date;
  inviterId: string;
}

export interface InvitationCreate {
  clientId: string;
  email: string;
  role?: string;
  expiresAt: Date;
  inviterId: string;
}

export class InvitationRepository extends BaseRepository<Invitation> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, invitation);
  }

  async create(data: InvitationCreate): Promise<Invitation> {
    const id = this.generateId();

    const [created] = await this.drizzle
      .insert(invitation)
      .values({
        id,
        clientId: data.clientId,
        email: data.email,
        role: data.role ?? null,
        status: 'pending',
        expiresAt: data.expiresAt,
        inviterId: data.inviterId,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async getByEmail(email: string, clientId: string): Promise<Invitation | null> {
    const rows = await this.drizzle
      .select()
      .from(invitation)
      .where(and(eq(invitation.email, email), eq(invitation.clientId, clientId)))
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async getPendingByEmail(email: string): Promise<Invitation | null> {
    const now = new Date();
    const rows = await this.drizzle
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.email, email),
          eq(invitation.status, 'pending'),
          gt(invitation.expiresAt, now)
        )
      )
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async listByClient(clientId: string): Promise<Invitation[]> {
    const rows = await this.drizzle
      .select()
      .from(invitation)
      .where(eq(invitation.clientId, clientId));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listPendingByClient(clientId: string): Promise<Invitation[]> {
    const now = new Date();
    const rows = await this.drizzle
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.clientId, clientId),
          eq(invitation.status, 'pending'),
          gt(invitation.expiresAt, now)
        )
      );

    return rows.map((row) => this.mapToEntity(row));
  }

  async accept(id: string): Promise<Invitation> {
    const [updated] = await this.drizzle
      .update(invitation)
      .set({ status: 'accepted' })
      .where(eq(invitation.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError('invitation', id);
    }

    return this.mapToEntity(updated);
  }

  async revoke(id: string): Promise<Invitation> {
    const [updated] = await this.drizzle
      .update(invitation)
      .set({ status: 'revoked' })
      .where(eq(invitation.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError('invitation', id);
    }

    return this.mapToEntity(updated);
  }

  async expireOld(): Promise<number> {
    const now = new Date();
    const result = await this.drizzle
      .update(invitation)
      .set({ status: 'expired' })
      .where(
        and(
          eq(invitation.status, 'pending'),
          lt(invitation.expiresAt, now)
        )
      )
      .returning();

    return result.length;
  }
}



