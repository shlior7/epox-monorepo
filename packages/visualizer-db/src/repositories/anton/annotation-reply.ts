import { eq, sql, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../../client';
import { antonAnnotationReply } from '../../schema/anton';
import { BaseRepository } from '../base';

export interface AntonAnnotationReply {
  id: string;
  annotationId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AntonAnnotationReplyCreate {
  annotationId: string;
  authorId: string;
  content: string;
}

export interface AntonAnnotationReplyUpdate {
  content?: string;
}

export class AntonAnnotationReplyRepository extends BaseRepository<AntonAnnotationReply> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, antonAnnotationReply);
  }

  async create(data: AntonAnnotationReplyCreate): Promise<AntonAnnotationReply> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(antonAnnotationReply)
      .values({
        id,
        annotationId: data.annotationId,
        authorId: data.authorId,
        content: data.content,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async listByAnnotationId(annotationId: string): Promise<AntonAnnotationReply[]> {
    const rows = await this.drizzle
      .select()
      .from(antonAnnotationReply)
      .where(eq(antonAnnotationReply.annotationId, annotationId));

    return rows.map((row) => this.mapToEntity(row));
  }

  async update(id: string, data: AntonAnnotationReplyUpdate): Promise<AntonAnnotationReply> {
    const now = new Date();

    const [updated] = await this.drizzle
      .update(antonAnnotationReply)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(antonAnnotationReply.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Annotation reply not found: ${id}`);
    }

    return this.mapToEntity(updated);
  }

  async count(annotationId: string): Promise<number> {
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(antonAnnotationReply)
      .where(eq(antonAnnotationReply.annotationId, annotationId));

    return result.count;
  }
}
