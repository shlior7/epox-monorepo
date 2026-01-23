import { asc, eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { favoriteImage } from '../schema/generated-images';
import type { FavoriteImage } from 'visualizer-types';
import { BaseRepository } from './base';

export class FavoriteImageRepository extends BaseRepository<FavoriteImage> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, favoriteImage);
  }

  async create(clientId: string, generatedAssetId: string): Promise<FavoriteImage> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(favoriteImage)
      .values({
        id,
        clientId,
        generatedAssetId,
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

  async getByAsset(clientId: string, generatedAssetId: string): Promise<FavoriteImage | null> {
    const rows = await this.drizzle
      .select()
      .from(favoriteImage)
      .where(eq(favoriteImage.generatedAssetId, generatedAssetId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    // Verify it belongs to the client
    if (row.clientId !== clientId) {
      return null;
    }

    return this.mapToEntity(row);
  }

  async deleteByAsset(clientId: string, generatedAssetId: string): Promise<void> {
    await this.drizzle
      .delete(favoriteImage)
      .where(eq(favoriteImage.generatedAssetId, generatedAssetId));
  }

  /**
   * Toggle favorite status for an asset
   * Returns true if favorited, false if unfavorited
   */
  async toggle(clientId: string, generatedAssetId: string): Promise<boolean> {
    const existing = await this.getByAsset(clientId, generatedAssetId);

    if (existing) {
      // Remove favorite
      await this.deleteByAsset(clientId, generatedAssetId);
      return false;
    } else {
      // Add favorite
      await this.create(clientId, generatedAssetId);
      return true;
    }
  }
}
