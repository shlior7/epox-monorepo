import { asc, eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { favoriteImage } from '../schema/generated-images';
import type { FavoriteImage } from '../types';
import { BaseRepository } from './base';

export class FavoriteImageRepository extends BaseRepository<FavoriteImage> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, favoriteImage);
  }

  async create(clientId: string, generatedImageId: string): Promise<FavoriteImage> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(favoriteImage)
      .values({
        id,
        clientId,
        generatedImageId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async listByClient(clientId: string): Promise<FavoriteImage[]> {
    const rows = await this.drizzle
      .select()
      .from(favoriteImage)
      .where(eq(favoriteImage.clientId, clientId))
      .orderBy(asc(favoriteImage.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }
}
