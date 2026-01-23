import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../../client';
import { antonPage } from '../../schema/anton';
import { BaseRepository } from '../base';

export interface AntonPage {
  id: string;
  projectId: string;
  url: string;
  normalizedUrl: string;
  title: string | null;
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AntonPageCreate {
  projectId: string;
  url: string;
  title?: string;
  thumbnail?: string;
}

export interface AntonPageUpdate {
  title?: string;
  thumbnail?: string;
}

export class AntonPageRepository extends BaseRepository<AntonPage> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, antonPage);
  }

  /**
   * Normalize URL by removing query params and hash
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      // Fallback: simple regex-based normalization
      return url.split('?')[0].split('#')[0];
    }
  }

  async create(data: AntonPageCreate): Promise<AntonPage> {
    const id = this.generateId();
    const now = new Date();
    const normalizedUrl = this.normalizeUrl(data.url);

    const [created] = await this.drizzle
      .insert(antonPage)
      .values({
        id,
        projectId: data.projectId,
        url: data.url,
        normalizedUrl,
        title: data.title ?? null,
        thumbnail: data.thumbnail ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async listByProjectId(projectId: string): Promise<AntonPage[]> {
    const rows = await this.drizzle.select().from(antonPage).where(eq(antonPage.projectId, projectId));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getByProjectAndUrl(projectId: string, url: string): Promise<AntonPage | null> {
    const normalizedUrl = this.normalizeUrl(url);

    const [row] = await this.drizzle
      .select()
      .from(antonPage)
      .where(and(eq(antonPage.projectId, projectId), eq(antonPage.normalizedUrl, normalizedUrl)))
      .limit(1);

    return row ? this.mapToEntity(row) : null;
  }

  /**
   * Get or create a page for the given project and URL
   */
  async getOrCreate(data: AntonPageCreate): Promise<AntonPage> {
    const existing = await this.getByProjectAndUrl(data.projectId, data.url);
    if (existing) {
      return existing;
    }

    return this.create(data);
  }

  async update(id: string, data: AntonPageUpdate): Promise<AntonPage> {
    const now = new Date();

    const [updated] = await this.drizzle
      .update(antonPage)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(antonPage.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Page not found: ${id}`);
    }

    return this.mapToEntity(updated);
  }

  async count(projectId: string): Promise<number> {
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(antonPage)
      .where(eq(antonPage.projectId, projectId));

    return result.count;
  }
}
