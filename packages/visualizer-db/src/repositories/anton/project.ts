import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../../client';
import { antonProject } from '../../schema/anton';
import { BaseRepository } from '../base';
import { updateWithVersion } from '../../utils/optimistic-lock';

export interface AntonProject {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  urlPatterns: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AntonProjectCreate {
  workspaceId: string;
  name: string;
  description?: string;
  urlPatterns?: string[];
}

export interface AntonProjectUpdate {
  name?: string;
  description?: string;
  urlPatterns?: string[];
}

export class AntonProjectRepository extends BaseRepository<AntonProject> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, antonProject);
  }

  async create(data: AntonProjectCreate): Promise<AntonProject> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(antonProject)
      .values({
        id,
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description ?? null,
        urlPatterns: data.urlPatterns ?? [],
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async listByWorkspaceId(workspaceId: string): Promise<AntonProject[]> {
    const rows = await this.drizzle.select().from(antonProject).where(eq(antonProject.workspaceId, workspaceId));

    return rows.map((row) => this.mapToEntity(row));
  }

  async update(id: string, data: AntonProjectUpdate, expectedVersion?: number): Promise<AntonProject> {
    return updateWithVersion<AntonProject>(this.drizzle, antonProject, id, data, expectedVersion);
  }

  /**
   * Match URL against project URL patterns
   * Returns projects that match the given URL
   */
  async matchByUrl(workspaceId: string, url: string): Promise<AntonProject[]> {
    const projects = await this.listByWorkspaceId(workspaceId);

    return projects.filter((project) => {
      if (!project.urlPatterns || project.urlPatterns.length === 0) {
        return false;
      }

      return project.urlPatterns.some((pattern) => {
        // Convert simple glob patterns to regex
        // Support: * (any chars), ** (any segments), ? (single char)
        const regexPattern = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
          .replace(/\*\*/g, '___DOUBLE_STAR___') // Temp placeholder
          .replace(/\*/g, '[^/]*') // * matches any chars except /
          .replace(/___DOUBLE_STAR___/g, '.*') // ** matches any chars including /
          .replace(/\?/g, '.'); // ? matches single char

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(url);
      });
    });
  }

  async count(workspaceId: string): Promise<number> {
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(antonProject)
      .where(eq(antonProject.workspaceId, workspaceId));

    return result.count;
  }
}
