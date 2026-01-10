import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { NotFoundError } from '../errors';
import { productImage } from '../schema/products';
import type { ProductImage, ProductImageCreate, ProductImageUpdate } from '../types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { withTransaction } from '../utils/transactions';
import { BaseRepository } from './base';

export class ProductImageRepository extends BaseRepository<ProductImage> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, productImage);
  }

  async create(productId: string, data: ProductImageCreate): Promise<ProductImage> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(productImage)
      .values({
        id,
        productId,
        r2KeyBase: data.r2KeyBase,
        r2KeyPreview: data.r2KeyPreview ?? null,
        sortOrder: data.sortOrder ?? 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async list(productId: string): Promise<ProductImage[]> {
    const rows = await this.drizzle
      .select()
      .from(productImage)
      .where(eq(productImage.productId, productId))
      .orderBy(asc(productImage.sortOrder));

    return rows.map((row) => this.mapToEntity(row));
  }

  async update(id: string, data: Partial<ProductImageUpdate>, expectedVersion?: number): Promise<ProductImage> {
    return updateWithVersion<ProductImage>(this.drizzle, productImage, id, data, expectedVersion);
  }

  async reorderByImageIds(productId: string, imageIds: string[]): Promise<void> {
    if (imageIds.length === 0) {
      return;
    }

    const rows = await this.drizzle.select().from(productImage).where(eq(productImage.productId, productId));
    const imageMap = new Map<string, ProductImage>();

    rows.forEach((row) => {
      const filename = row.r2KeyBase.split('/').pop() ?? row.r2KeyBase;
      const imageId = filename.replace(/\.[^/.]+$/, '');
      imageMap.set(imageId, row as ProductImage);
    });

    const now = new Date();
    await withTransaction(this.drizzle, async (tx) => {
      for (const [index, imageId] of imageIds.entries()) {
        const imageRow = imageMap.get(imageId);
        if (!imageRow) continue;
        await tx
          .update(productImage)
          .set({
            sortOrder: index,
            updatedAt: now,
            version: sql`${productImage.version} + 1`,
          })
          .where(eq(productImage.id, imageRow.id));
      }
    });
  }

  async reorder(productId: string, imageIds: string[]): Promise<void> {
    if (imageIds.length === 0) {
      return;
    }

    const rows = await this.drizzle
      .select({ id: productImage.id })
      .from(productImage)
      .where(and(eq(productImage.productId, productId), inArray(productImage.id, imageIds)));

    const foundIds = new Set(rows.map((row) => row.id));
    const missing = imageIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundError('product_image', missing[0]);
    }

    const now = new Date();
    await withTransaction(this.drizzle, async (tx) => {
      for (const [index, imageId] of imageIds.entries()) {
        await tx
          .update(productImage)
          .set({
            sortOrder: index,
            updatedAt: now,
            version: sql`${productImage.version} + 1`,
          })
          .where(and(eq(productImage.id, imageId), eq(productImage.productId, productId)));
      }
    });
  }
}
