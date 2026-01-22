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

    // If this is the first image or explicitly set as primary, set isPrimary
    const existingImages = await this.list(productId);
    const shouldBePrimary = data.isPrimary ?? existingImages.length === 0;

    // If setting as primary, clear other primaries first
    if (shouldBePrimary && existingImages.length > 0) {
      await this.drizzle.update(productImage).set({ isPrimary: false, updatedAt: now }).where(eq(productImage.productId, productId));
    }

    const [created] = await this.drizzle
      .insert(productImage)
      .values({
        id,
        productId,
        r2KeyBase: data.r2KeyBase,
        r2KeyPreview: data.r2KeyPreview ?? null,
        sortOrder: data.sortOrder ?? 0,
        isPrimary: shouldBePrimary,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  /**
   * Set an image as primary, clearing other primaries for the same product
   */
  async setPrimary(productId: string, imageId: string): Promise<ProductImage> {
    const now = new Date();

    // First, verify the image exists and belongs to the product
    const image = await this.getById(imageId);
    if (!image || image.productId !== productId) {
      throw new NotFoundError('product_image', imageId);
    }

    // Clear all other primaries for this product
    await this.drizzle
      .update(productImage)
      .set({ isPrimary: false, updatedAt: now })
      .where(and(eq(productImage.productId, productId), eq(productImage.isPrimary, true)));

    // Set the new primary
    const [updated] = await this.drizzle
      .update(productImage)
      .set({ isPrimary: true, updatedAt: now, version: sql`${productImage.version} + 1` })
      .where(eq(productImage.id, imageId))
      .returning();

    return this.mapToEntity(updated);
  }

  /**
   * Get the primary image for a product
   */
  async getPrimary(productId: string): Promise<ProductImage | null> {
    const [row] = await this.drizzle
      .select()
      .from(productImage)
      .where(and(eq(productImage.productId, productId), eq(productImage.isPrimary, true)))
      .limit(1);

    if (!row) {
      // Fallback to first image by sort order if no primary is set
      const [firstImage] = await this.drizzle
        .select()
        .from(productImage)
        .where(eq(productImage.productId, productId))
        .orderBy(asc(productImage.sortOrder))
        .limit(1);

      return firstImage ? this.mapToEntity(firstImage) : null;
    }

    return this.mapToEntity(row);
  }

  async list(productId: string): Promise<ProductImage[]> {
    const rows = await this.drizzle
      .select()
      .from(productImage)
      .where(eq(productImage.productId, productId))
      .orderBy(asc(productImage.sortOrder));

    return rows.map((row) => this.mapToEntity(row));
  }

  // ===== BATCH FETCH BY PRODUCT IDS (for N+1 elimination) =====

  async listByProductIds(productIds: string[]): Promise<Map<string, ProductImage[]>> {
    if (productIds.length === 0) {
      return new Map();
    }

    const rows = await this.drizzle
      .select()
      .from(productImage)
      .where(inArray(productImage.productId, productIds))
      .orderBy(sql`${productImage.isPrimary} DESC`, asc(productImage.sortOrder));

    const result = new Map<string, ProductImage[]>();
    for (const productId of productIds) {
      result.set(productId, []);
    }
    for (const row of rows) {
      const images = result.get(row.productId) || [];
      images.push(this.mapToEntity(row));
      result.set(row.productId, images);
    }

    return result;
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
