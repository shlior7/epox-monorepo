import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../../client';
import { antonProjectMember } from '../../schema/anton';
import { BaseRepository } from '../base';

export interface AntonProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'admin' | 'member' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface AntonProjectMemberCreate {
  projectId: string;
  userId: string;
  role?: 'admin' | 'member' | 'viewer';
}

export interface AntonProjectMemberUpdate {
  role?: 'admin' | 'member' | 'viewer';
}

export class AntonProjectMemberRepository extends BaseRepository<AntonProjectMember> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, antonProjectMember);
  }

  async create(data: AntonProjectMemberCreate): Promise<AntonProjectMember> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(antonProjectMember)
      .values({
        id,
        projectId: data.projectId,
        userId: data.userId,
        role: data.role ?? 'member',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async listByProjectId(projectId: string): Promise<AntonProjectMember[]> {
    const rows = await this.drizzle.select().from(antonProjectMember).where(eq(antonProjectMember.projectId, projectId));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getByProjectAndUser(projectId: string, userId: string): Promise<AntonProjectMember | null> {
    const [row] = await this.drizzle
      .select()
      .from(antonProjectMember)
      .where(and(eq(antonProjectMember.projectId, projectId), eq(antonProjectMember.userId, userId)))
      .limit(1);

    return row ? this.mapToEntity(row) : null;
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const member = await this.getByProjectAndUser(projectId, userId);
    return member !== null;
  }

  async hasRole(projectId: string, userId: string, requiredRoles: Array<'admin' | 'member' | 'viewer'>): Promise<boolean> {
    const member = await this.getByProjectAndUser(projectId, userId);
    return member !== null && requiredRoles.includes(member.role);
  }

  async update(id: string, data: AntonProjectMemberUpdate): Promise<AntonProjectMember> {
    const now = new Date();

    const [updated] = await this.drizzle
      .update(antonProjectMember)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(antonProjectMember.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Project member not found: ${id}`);
    }

    return this.mapToEntity(updated);
  }

  async deleteByProjectAndUser(projectId: string, userId: string): Promise<void> {
    await this.drizzle
      .delete(antonProjectMember)
      .where(and(eq(antonProjectMember.projectId, projectId), eq(antonProjectMember.userId, userId)));
  }
}
