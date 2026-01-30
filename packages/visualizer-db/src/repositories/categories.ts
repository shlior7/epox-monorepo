import { and, asc, eq, ilike, inArray } from 'drizzle-orm';
import type { Category, CategoryCreate, CategoryUpdate, ProductCategory, CategoryGenerationSettings } from 'visualizer-types';
import type { DrizzleClient } from '../client';
import { category, productCategory } from '../schema/categories';
import { BaseRepository } from './base';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface CategoryListOptions {
  search?: string;
  parentId?: string | null;
  sort?: 'name' | 'sortOrder' | 'created';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CategoryWithProductCount extends Category {
  productCount: number;
}

/**
 * Repository for Category table.
 */
export class CategoryRepository extends BaseRepository<Category> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, category);
  }

  async create(data: CategoryCreate): Promise<Category> {
    const id = this.generateId();
    const now = new Date();
    const slug = data.slug || slugify(data.name);

    // Use onConflictDoNothing to prevent duplicates on (clientId, slug)
    const rows = await this.drizzle
      .insert(category)
      .values({
        id,
        clientId: data.clientId,
        name: data.name,
        slug,
        description: data.description ?? null,
        parentId: data.parentId ?? null,
        generationSettings: data.generationSettings ?? null,
        sortOrder: data.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();

    // If conflict (duplicate slug for this client), return existing
    if (rows.length === 0) {
      const existing = await this.getBySlug(data.clientId, slug);
      if (existing) return existing;
      throw new Error(`Failed to create or find category with slug "${slug}"`);
    }

    return this.mapToEntity(rows[0]);
  }

  async update(id: string, data: CategoryUpdate): Promise<Category> {
    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.generationSettings !== undefined) updateData.generationSettings = data.generationSettings;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const [updated] = await this.drizzle.update(category).set(updateData).where(eq(category.id, id)).returning();

    return this.mapToEntity(updated);
  }

  async listByClient(clientId: string, options: CategoryListOptions = {}): Promise<Category[]> {
    const conditions = [eq(category.clientId, clientId)];

    if (options.search) {
      conditions.push(ilike(category.name, `%${options.search}%`));
    }

    if (options.parentId !== undefined) {
      if (options.parentId === null) {
        conditions.push(eq(category.parentId, null as unknown as string));
      } else {
        conditions.push(eq(category.parentId, options.parentId));
      }
    }

    const query = this.drizzle
      .select()
      .from(category)
      .where(and(...conditions))
      .orderBy(asc(category.sortOrder), asc(category.name))
      .limit(options.limit ?? 1000)
      .offset(options.offset ?? 0);

    const rows = await query;
    return rows.map((row) => this.mapToEntity(row));
  }

  async getBySlug(clientId: string, slug: string): Promise<Category | null> {
    const rows = await this.drizzle
      .select()
      .from(category)
      .where(and(eq(category.clientId, clientId), eq(category.slug, slug)))
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async getOrCreate(clientId: string, name: string): Promise<Category> {
    const slug = slugify(name);
    const existing = await this.getBySlug(clientId, slug);
    if (existing) {
      return existing;
    }
    return this.create({ clientId, name, slug });
  }

  async updateSettings(id: string, settings: CategoryGenerationSettings): Promise<Category> {
    return this.update(id, { generationSettings: settings });
  }
}

/**
 * Repository for ProductCategory junction table.
 */
export class ProductCategoryRepository {
  constructor(private drizzle: DrizzleClient) {}

  async link(productId: string, categoryId: string, isPrimary = false): Promise<ProductCategory> {
    const now = new Date();

    // If setting as primary, first unset any existing primary for this product
    if (isPrimary) {
      await this.drizzle
        .update(productCategory)
        .set({ isPrimary: false })
        .where(and(eq(productCategory.productId, productId), eq(productCategory.isPrimary, true)));
    }

    const [created] = await this.drizzle
      .insert(productCategory)
      .values({
        productId,
        categoryId,
        isPrimary,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [productCategory.productId, productCategory.categoryId],
        set: { isPrimary },
      })
      .returning();

    return created as ProductCategory;
  }

  async unlink(productId: string, categoryId: string): Promise<void> {
    await this.drizzle
      .delete(productCategory)
      .where(and(eq(productCategory.productId, productId), eq(productCategory.categoryId, categoryId)));
  }

  async listByProduct(productId: string): Promise<ProductCategory[]> {
    const rows = await this.drizzle.select().from(productCategory).where(eq(productCategory.productId, productId));

    return rows as ProductCategory[];
  }

  async listByCategory(categoryId: string): Promise<ProductCategory[]> {
    const rows = await this.drizzle.select().from(productCategory).where(eq(productCategory.categoryId, categoryId));

    return rows as ProductCategory[];
  }

  async getPrimaryCategory(productId: string): Promise<ProductCategory | null> {
    const rows = await this.drizzle
      .select()
      .from(productCategory)
      .where(and(eq(productCategory.productId, productId), eq(productCategory.isPrimary, true)))
      .limit(1);

    return rows[0] ? (rows[0] as ProductCategory) : null;
  }

  async setPrimary(productId: string, categoryId: string): Promise<void> {
    // Unset all primaries for this product
    await this.drizzle
      .update(productCategory)
      .set({ isPrimary: false })
      .where(and(eq(productCategory.productId, productId), eq(productCategory.isPrimary, true)));

    // Set the new primary
    await this.drizzle
      .update(productCategory)
      .set({ isPrimary: true })
      .where(and(eq(productCategory.productId, productId), eq(productCategory.categoryId, categoryId)));
  }

  async replaceProductCategories(productId: string, categoryIds: string[], primaryCategoryId?: string): Promise<void> {
    // Delete existing links
    await this.drizzle.delete(productCategory).where(eq(productCategory.productId, productId));

    // Insert new links
    if (categoryIds.length > 0) {
      const now = new Date();
      await this.drizzle.insert(productCategory).values(
        categoryIds.map((categoryId) => ({
          productId,
          categoryId,
          isPrimary: categoryId === primaryCategoryId,
          createdAt: now,
        }))
      );
    }
  }

  async getProductsWithCategories(
    productIds: string[]
  ): Promise<Map<string, Array<{ categoryId: string; isPrimary: boolean }>>> {
    if (productIds.length === 0) {
      return new Map();
    }

    const rows = await this.drizzle.select().from(productCategory).where(inArray(productCategory.productId, productIds));

    const result = new Map<string, Array<{ categoryId: string; isPrimary: boolean }>>();
    for (const row of rows) {
      const existing = result.get(row.productId) ?? [];
      existing.push({ categoryId: row.categoryId, isPrimary: row.isPrimary });
      result.set(row.productId, existing);
    }

    return result;
  }
}
