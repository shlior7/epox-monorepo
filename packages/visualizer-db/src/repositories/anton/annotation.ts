import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../../client';
import { antonAnnotation } from '../../schema/anton';
import type { AnnotationPosition, ElementContext } from '../../schema/anton';
import { BaseRepository } from '../base';
import { updateWithVersion } from '../../utils/optimistic-lock';

export interface AntonAnnotation {
  id: string;
  pageId: string;
  projectId: string;
  authorId: string;
  content: string;
  position: AnnotationPosition;
  elementSelectors: string[] | null;
  screenLocationX: string | null;
  screenLocationY: string | null;
  elementHtml: string | null;
  elementStyles: Record<string, string> | null;
  elementScreenshot: string | null;
  elementBoundingRect: { width: number; height: number; top: number; left: number } | null;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AntonAnnotationCreate {
  pageId: string;
  projectId: string;
  authorId: string;
  content: string;
  position: AnnotationPosition;
  elementSelectors?: string[];
  screenLocationX?: number;
  screenLocationY?: number;
  elementHtml?: string;
  elementStyles?: Record<string, string>;
  elementScreenshot?: string;
  elementBoundingRect?: { width: number; height: number; top: number; left: number };
}

export interface AntonAnnotationUpdate {
  content?: string;
  position?: AnnotationPosition;
  isResolved?: boolean;
  resolvedBy?: string;
}

export class AntonAnnotationRepository extends BaseRepository<AntonAnnotation> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, antonAnnotation);
  }

  async create(data: AntonAnnotationCreate): Promise<AntonAnnotation> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(antonAnnotation)
      .values({
        id,
        pageId: data.pageId,
        projectId: data.projectId,
        authorId: data.authorId,
        content: data.content,
        position: data.position,
        elementSelectors: data.elementSelectors ?? null,
        screenLocationX: data.screenLocationX?.toString() ?? null,
        screenLocationY: data.screenLocationY?.toString() ?? null,
        elementHtml: data.elementHtml ?? null,
        elementStyles: data.elementStyles ?? null,
        elementScreenshot: data.elementScreenshot ?? null,
        elementBoundingRect: data.elementBoundingRect ?? null,
        isResolved: false,
        resolvedAt: null,
        resolvedBy: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async listByPageId(pageId: string): Promise<AntonAnnotation[]> {
    const rows = await this.drizzle.select().from(antonAnnotation).where(eq(antonAnnotation.pageId, pageId));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listByProjectId(projectId: string, resolved?: boolean): Promise<AntonAnnotation[]> {
    const conditions: SQL[] = [eq(antonAnnotation.projectId, projectId)];

    if (resolved !== undefined) {
      conditions.push(eq(antonAnnotation.isResolved, resolved));
    }

    const rows = await this.drizzle.select().from(antonAnnotation).where(and(...conditions));

    return rows.map((row) => this.mapToEntity(row));
  }

  /**
   * Find annotation by trying selectors bottom-up (most specific last)
   */
  async findBySelector(pageId: string, selectors: string[]): Promise<AntonAnnotation | null> {
    // Try each selector from most specific to least specific
    for (let i = selectors.length - 1; i >= 0; i--) {
      const selector = selectors[i];

      // Query annotations that have this selector in their elementSelectors array
      const rows = await this.drizzle
        .select()
        .from(antonAnnotation)
        .where(
          and(
            eq(antonAnnotation.pageId, pageId),
            sql`${antonAnnotation.elementSelectors} @> ${JSON.stringify([selector])}::jsonb`
          )
        )
        .limit(1);

      if (rows.length > 0) {
        return this.mapToEntity(rows[0]);
      }
    }

    return null;
  }

  /**
   * Find annotation by screen location with tolerance
   */
  async findByLocation(pageId: string, x: number, y: number, tolerance: number = 5): Promise<AntonAnnotation | null> {
    const xMin = x - tolerance;
    const xMax = x + tolerance;
    const yMin = y - tolerance;
    const yMax = y + tolerance;

    const rows = await this.drizzle
      .select()
      .from(antonAnnotation)
      .where(
        and(
          eq(antonAnnotation.pageId, pageId),
          sql`${antonAnnotation.screenLocationX}::decimal BETWEEN ${xMin} AND ${xMax}`,
          sql`${antonAnnotation.screenLocationY}::decimal BETWEEN ${yMin} AND ${yMax}`
        )
      )
      .limit(1);

    return rows.length > 0 ? this.mapToEntity(rows[0]) : null;
  }

  async update(id: string, data: AntonAnnotationUpdate, expectedVersion?: number): Promise<AntonAnnotation> {
    const updateData: any = { ...data };

    if (data.isResolved === true) {
      updateData.resolvedAt = new Date();
    } else if (data.isResolved === false) {
      updateData.resolvedAt = null;
      updateData.resolvedBy = null;
    }

    return updateWithVersion<AntonAnnotation>(this.drizzle, antonAnnotation, id, updateData, expectedVersion);
  }

  async count(projectId: string, resolved?: boolean): Promise<number> {
    const conditions: SQL[] = [eq(antonAnnotation.projectId, projectId)];

    if (resolved !== undefined) {
      conditions.push(eq(antonAnnotation.isResolved, resolved));
    }

    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(antonAnnotation)
      .where(and(...conditions));

    return result.count;
  }
}
