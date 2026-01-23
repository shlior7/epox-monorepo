import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../../client';
import { antonWorkspace, antonWorkspaceMember } from '../../schema/anton';
import { BaseRepository } from '../base';
import { updateWithVersion } from '../../utils/optimistic-lock';

export interface AntonWorkspace {
  id: string;
  name: string;
  ownerId: string;
  maxProjects: number;
  maxMembers: number;
  isPremium: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AntonWorkspaceCreate {
  name: string;
  ownerId: string;
  maxProjects?: number;
  maxMembers?: number;
}

export interface AntonWorkspaceUpdate {
  name?: string;
  maxProjects?: number;
  maxMembers?: number;
  isPremium?: boolean;
}

export class AntonWorkspaceRepository extends BaseRepository<AntonWorkspace> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, antonWorkspace);
  }

  async create(data: AntonWorkspaceCreate): Promise<AntonWorkspace> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(antonWorkspace)
      .values({
        id,
        name: data.name,
        ownerId: data.ownerId,
        maxProjects: data.maxProjects ?? 3,
        maxMembers: data.maxMembers ?? 5,
        isPremium: false,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Automatically add owner as member with 'owner' role
    await this.drizzle.insert(antonWorkspaceMember).values({
      id: this.generateId(),
      workspaceId: id,
      userId: data.ownerId,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });

    return this.mapToEntity(created);
  }

  async listByUserId(userId: string): Promise<AntonWorkspace[]> {
    const rows = await this.drizzle
      .select({
        workspace: antonWorkspace,
      })
      .from(antonWorkspace)
      .innerJoin(antonWorkspaceMember, eq(antonWorkspaceMember.workspaceId, antonWorkspace.id))
      .where(eq(antonWorkspaceMember.userId, userId));

    return rows.map((row) => this.mapToEntity(row.workspace));
  }

  async update(id: string, data: AntonWorkspaceUpdate, expectedVersion?: number): Promise<AntonWorkspace> {
    return updateWithVersion<AntonWorkspace>(this.drizzle, antonWorkspace, id, data, expectedVersion);
  }

  async countProjects(workspaceId: string): Promise<number> {
    const { antonProject } = await import('../../schema/anton');
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(antonProject)
      .where(eq(antonProject.workspaceId, workspaceId));

    return result.count;
  }

  async countMembers(workspaceId: string): Promise<number> {
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(antonWorkspaceMember)
      .where(eq(antonWorkspaceMember.workspaceId, workspaceId));

    return result.count;
  }

  async canAddProject(workspaceId: string): Promise<boolean> {
    const workspace = await this.requireById(workspaceId);
    const currentCount = await this.countProjects(workspaceId);
    return currentCount < workspace.maxProjects;
  }

  async canAddMember(workspaceId: string): Promise<boolean> {
    const workspace = await this.requireById(workspaceId);
    const currentCount = await this.countMembers(workspaceId);
    return currentCount < workspace.maxMembers;
  }
}
