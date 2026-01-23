import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../../client';
import { antonWorkspaceMember } from '../../schema/anton';
import { BaseRepository } from '../base';

export interface AntonWorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface AntonWorkspaceMemberCreate {
  workspaceId: string;
  userId: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface AntonWorkspaceMemberUpdate {
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

export class AntonWorkspaceMemberRepository extends BaseRepository<AntonWorkspaceMember> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, antonWorkspaceMember);
  }

  async create(data: AntonWorkspaceMemberCreate): Promise<AntonWorkspaceMember> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(antonWorkspaceMember)
      .values({
        id,
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role ?? 'member',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async listByWorkspaceId(workspaceId: string): Promise<AntonWorkspaceMember[]> {
    const rows = await this.drizzle
      .select()
      .from(antonWorkspaceMember)
      .where(eq(antonWorkspaceMember.workspaceId, workspaceId));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getByWorkspaceAndUser(workspaceId: string, userId: string): Promise<AntonWorkspaceMember | null> {
    const [row] = await this.drizzle
      .select()
      .from(antonWorkspaceMember)
      .where(and(eq(antonWorkspaceMember.workspaceId, workspaceId), eq(antonWorkspaceMember.userId, userId)))
      .limit(1);

    return row ? this.mapToEntity(row) : null;
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const member = await this.getByWorkspaceAndUser(workspaceId, userId);
    return member !== null;
  }

  async hasRole(workspaceId: string, userId: string, requiredRoles: Array<'owner' | 'admin' | 'member' | 'viewer'>): Promise<boolean> {
    const member = await this.getByWorkspaceAndUser(workspaceId, userId);
    return member !== null && requiredRoles.includes(member.role);
  }

  async update(id: string, data: AntonWorkspaceMemberUpdate): Promise<AntonWorkspaceMember> {
    const now = new Date();

    const [updated] = await this.drizzle
      .update(antonWorkspaceMember)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(antonWorkspaceMember.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Workspace member not found: ${id}`);
    }

    return this.mapToEntity(updated);
  }

  async deleteByWorkspaceAndUser(workspaceId: string, userId: string): Promise<void> {
    await this.drizzle
      .delete(antonWorkspaceMember)
      .where(and(eq(antonWorkspaceMember.workspaceId, workspaceId), eq(antonWorkspaceMember.userId, userId)));
  }
}
