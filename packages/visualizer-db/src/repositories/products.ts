import { asc, eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { chatSession } from '../schema/sessions';
import { product } from '../schema/products';
import type { ChatSession, Product, ProductCreate, ProductImage, ProductUpdate, ProductWithDetails, ProductWithImages } from 'visualizer-types';
import { updateWithVersion } from '../utils/optimistic-lock';
import { BaseRepository } from './base';

export class ProductRepository extends BaseRepository<Product> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, product);
  }

  async create(clientId: string, data: ProductCreate): Promise<Product> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(product)
      .values({
        id,
        clientId,
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? null,
        roomTypes: data.roomTypes ?? null,
        modelFilename: data.modelFilename ?? null,
        isFavorite: data.isFavorite ?? false,
        source: data.source ?? 'uploaded',
        storeConnectionId: data.storeConnectionId ?? null,
        erpId: data.erpId ?? null,
        erpSku: data.erpSku ?? null,
        erpUrl: data.erpUrl ?? null,
        importedAt: data.importedAt ?? null,
        analysisData: data.analysisData ?? null,
        analysisVersion: data.analysisVersion ?? null,
        analyzedAt: data.analyzedAt ?? null,
        price: data.price ?? null,
        metadata: data.metadata ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async list(clientId: string): Promise<Product[]> {
    const rows = await this.drizzle.select().from(product).where(eq(product.clientId, clientId)).orderBy(asc(product.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async listWithImages(clientId: string): Promise<ProductWithImages[]> {
    const rows = await this.drizzle.query.product.findMany({
      where: eq(product.clientId, clientId),
      with: { images: true },
      orderBy: [asc(product.createdAt)],
    });

    return rows.map((row) => ({
      ...this.mapToEntity(row),
      images: row.images.map((image) => image as ProductImage),
    }));
  }

  async getWithImages(id: string): Promise<ProductWithImages | null> {
    const row = await this.drizzle.query.product.findFirst({
      where: eq(product.id, id),
      with: { images: true },
    });

    if (!row) {
      return null;
    }

    return {
      ...this.mapToEntity(row),
      images: row.images.map((image) => image as ProductImage),
    };
  }

  async getWithDetails(id: string): Promise<ProductWithDetails | null> {
    const row = await this.getWithImages(id);
    if (!row) {
      return null;
    }

    const sessions = await this.drizzle.query.chatSession.findMany({
      where: eq(chatSession.productId, id),
      orderBy: [asc(chatSession.createdAt)],
    });

    return {
      ...row,
      chatSessions: sessions as ChatSession[],
    };
  }

  async update(id: string, data: Partial<ProductUpdate>, expectedVersion?: number): Promise<Product> {
    return updateWithVersion<Product>(this.drizzle, product, id, data, expectedVersion);
  }
}
