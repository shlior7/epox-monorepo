/**
 * Server-side data fetching functions for SSR
 * These mirror the API routes but can be called directly from Server Components
 */

import { db } from '../services/db';
import { storage } from '../services/storage';
import type { DashboardResponse, Product, Collection } from '../api-client';
import type { CollectionSessionStatus, ProductSource } from 'visualizer-types';

// ===== Dashboard =====

export async function fetchDashboardData(clientId: string): Promise<DashboardResponse> {
  const [productCount, collectionCount, completedAssetsCount, recentCollectionsWithStats] =
    await Promise.all([
      db.products.count(clientId),
      db.collectionSessions.count(clientId),
      db.generatedAssets.countByStatus(clientId, 'completed'),
      db.collectionSessions.listWithAssetStats(clientId, {
        sort: 'recent',
        limit: 3,
      }),
    ]);

  const stats = {
    totalProducts: productCount,
    totalCollections: collectionCount,
    totalGenerated: completedAssetsCount,
    creditsRemaining: 500, // TODO: Integrate with quota service
  };

  const recentCollections = recentCollectionsWithStats.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status as 'draft' | 'generating' | 'completed',
    productCount: c.productIds.length,
    generatedCount: c.completedCount,
    totalImages: c.totalImages,
    updatedAt: c.updatedAt.toISOString(),
    thumbnailUrl: c.thumbnailUrl ?? '',
  }));

  return { stats, recentCollections };
}

// ===== Products =====

export interface ProductsQueryParams {
  search?: string;
  category?: string;
  source?: ProductSource;
  sort?: 'name' | 'price' | 'category' | 'created' | 'updated';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: {
    categories: string[];
    sceneTypes: string[];
  };
}

export async function fetchProducts(
  clientId: string,
  params: ProductsQueryParams = {}
): Promise<ProductsResponse> {
  const {
    search,
    category,
    source,
    sort = 'updated',
    order = 'desc',
    page = 1,
    limit = 20,
  } = params;

  const offset = (page - 1) * limit;

  const filterOptions = {
    search,
    category,
    source,
  };

  const [total, products, categories, sceneTypes] = await Promise.all([
    db.products.countWithFilters(clientId, filterOptions),
    db.products.listWithFiltersAndImages(clientId, {
      ...filterOptions,
      sort,
      order,
      limit,
      offset,
    }),
    db.products.getDistinctCategories(clientId),
    db.products.getDistinctSceneTypes(clientId),
  ]);

  const totalPages = Math.ceil(total / limit);

  const mappedProducts: Product[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.erpSku || `SKU-${p.id.slice(0, 8)}`,
    category: p.category || 'Uncategorized',
    description: p.description || '',
    sceneTypes: p.sceneTypes ?? [],
    source: p.source,
    analyzed: p.analyzedAt !== null,
    price: p.price ? parseFloat(p.price) : 0,
    isFavorite: p.isFavorite,
    images: p.images.map((img) => ({
      id: img.id,
      baseUrl: storage.getPublicUrl(img.r2KeyBase),
      previewUrl: img.r2KeyPreview ? storage.getPublicUrl(img.r2KeyPreview) : null,
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
    })),
    imageUrl: (() => {
      const primary = p.images.find((img) => img.isPrimary) ?? p.images[0];
      return primary ? storage.getPublicUrl(primary.r2KeyBase) : '';
    })(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return {
    products: mappedProducts,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    },
    filters: {
      categories,
      sceneTypes,
    },
  };
}

// ===== Collections =====

export interface CollectionsQueryParams {
  search?: string;
  status?: CollectionSessionStatus | 'all';
  sort?: 'recent' | 'name' | 'productCount';
  page?: number;
  limit?: number;
}

export interface CollectionsResponse {
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export async function fetchCollections(
  clientId: string,
  params: CollectionsQueryParams = {}
): Promise<CollectionsResponse> {
  const { search, status = 'all', sort = 'recent', page = 1, limit = 10 } = params;

  const offset = (page - 1) * limit;

  const filterOptions = {
    search,
    status,
  };

  const [total, collectionsWithStats] = await Promise.all([
    db.collectionSessions.countWithFilters(clientId, filterOptions),
    db.collectionSessions.listWithAssetStats(clientId, {
      ...filterOptions,
      sort,
      limit,
      offset,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const mappedCollections: Collection[] = collectionsWithStats.map((c) => {
    const productIds = c.productIds as string[];
    return {
      id: c.id,
      name: c.name,
      status: c.status as CollectionSessionStatus,
      productCount: productIds.length,
      productIds,
      generatedCount: c.completedCount,
      totalImages: c.totalImages,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      thumbnailUrl: c.thumbnailUrl ?? '',
    };
  });

  return {
    collections: mappedCollections,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

// ===== Assets =====

export interface AssetsQueryParams {
  sort?: 'date' | 'oldest';
  status?: 'pending' | 'generating' | 'completed' | 'error';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  limit?: number;
}

export interface GeneratedAssetWithMeta {
  id: string;
  url: string;
  productIds: string[];
  flowId?: string;
  sceneType: string;
  isPinned: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AssetsResponse {
  assets: GeneratedAssetWithMeta[];
}

export async function fetchAssets(
  clientId: string,
  params: AssetsQueryParams = {}
): Promise<AssetsResponse> {
  const { sort = 'date', status, approvalStatus, limit = 100 } = params;

  const assets = await db.generatedAssets.listWithFilters(clientId, {
    sort,
    status,
    approvalStatus,
    limit,
  });

  const mappedAssets: GeneratedAssetWithMeta[] = assets.map((a) => {
    // Extract sceneType from settings if available
    const sceneTypes = (a.settings as { promptTags?: { sceneType?: string[] } } | null)?.promptTags
      ?.sceneType;
    const sceneType = sceneTypes?.[0] || 'Unknown';

    return {
      id: a.id,
      url: a.assetUrl,
      productIds: a.productIds ?? [],
      flowId: a.generationFlowId ?? undefined,
      sceneType,
      isPinned: a.pinned,
      approvalStatus: a.approvalStatus as 'pending' | 'approved' | 'rejected',
      createdAt: a.createdAt.toISOString(),
    };
  });

  return { assets: mappedAssets };
}

// ===== Product Detail =====

export async function fetchProductDetail(clientId: string, productId: string) {
  // Fetch product with images and assets in parallel
  const [product, generatedAssets, assetStats] = await Promise.all([
    db.products.getWithImages(productId),
    db.generatedAssets.listByProductId(clientId, productId, 100),
    db.generatedAssets.getStatsByProductId(clientId, productId),
  ]);

  if (!product || product.clientId !== clientId) {
    return null;
  }

  // Parse analysis data if available
  const analysisData = product.analysisData as {
    productType?: string;
    materials?: string[];
    colors?: string[];
    styles?: string[];
    dominantColorHex?: string;
  } | null;

  return {
    id: product.id,
    name: product.name,
    sku: product.erpSku || `SKU-${product.id.slice(0, 8)}`,
    category: product.category || 'Uncategorized',
    description: product.description || '',
    sceneTypes: product.sceneTypes ?? [],
    source: product.source,
    price: product.price ? parseFloat(product.price) : 0,
    baseImages: product.images.map((img) => ({
      id: img.id,
      url: storage.getPublicUrl(img.r2KeyBase),
      isPrimary: img.isPrimary,
      sortOrder: img.sortOrder,
    })),
    analysis: analysisData
      ? {
          productType: analysisData.productType ?? '',
          materials: analysisData.materials ?? [],
          colors: analysisData.colors ?? [],
          style: analysisData.styles ?? [],
          dominantColorHex: analysisData.dominantColorHex ?? '#000000',
        }
      : null,
    generatedAssets: generatedAssets.map((a) => {
      const sceneTypes = (a.settings as { promptTags?: { sceneType?: string[] } } | null)
        ?.promptTags?.sceneType;
      return {
        id: a.id,
        url: a.assetUrl,
        sceneType: sceneTypes?.[0] || 'Unknown',
        isPinned: a.pinned,
        approvalStatus: a.approvalStatus,
        rating: 0,
        createdAt: a.createdAt.toISOString(),
      };
    }),
    stats: assetStats,
    collections: [], // TODO: fetch collections containing this product
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

// ===== Collection Detail =====

export async function fetchCollectionDetail(clientId: string, collectionId: string) {
  // Fetch collection with flows
  const collection = await db.collectionSessions.getWithFlows(collectionId);

  if (!collection || collection.clientId !== clientId) {
    return null;
  }

  // Fetch products by IDs if collection has products
  const productIds = collection.productIds as string[];
  let productsWithImages: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    imageUrl: string;
    images: Array<{
      id: string;
      baseUrl: string;
      previewUrl: string | null;
      sortOrder: number;
    }>;
  }> = [];

  if (productIds.length > 0) {
    const products = await db.products.listWithFiltersAndImages(clientId, {
      limit: productIds.length,
    });

    // Filter to only products in this collection
    const collectionProducts = products.filter((p) => productIds.includes(p.id));

    productsWithImages = collectionProducts.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.erpSku || `SKU-${p.id.slice(0, 8)}`,
      category: p.category || 'Uncategorized',
      imageUrl:
        (p.images.find((img) => img.isPrimary) ?? p.images[0])
          ? storage.getPublicUrl((p.images.find((img) => img.isPrimary) ?? p.images[0]).r2KeyBase)
          : '',
      images: p.images.map((img) => ({
        id: img.id,
        baseUrl: storage.getPublicUrl(img.r2KeyBase),
        previewUrl: img.r2KeyPreview ? storage.getPublicUrl(img.r2KeyPreview) : null,
        sortOrder: img.sortOrder,
      })),
    }));
  }

  return {
    id: collection.id,
    name: collection.name,
    status: collection.status,
    productCount: productIds.length,
    productIds,
    products: productsWithImages,
    settings: collection.settings,
    generationFlows: collection.generationFlows,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}
