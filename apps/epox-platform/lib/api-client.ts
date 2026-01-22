/**
 * API Client for epox-platform operations.
 * Centralizes all API calls with proper typing and error handling.
 */

import type { PromptTags } from './types';
import type { ImageAspectRatio } from 'visualizer-types';

// ===== Response Types =====

export interface DashboardStats {
  totalProducts: number;
  totalCollections: number;
  totalGenerated: number;
  creditsRemaining: number;
}

export interface RecentCollection {
  id: string;
  name: string;
  status: 'draft' | 'generating' | 'completed';
  productCount: number;
  generatedCount: number;
  totalImages: number;
  updatedAt: string;
  thumbnailUrl?: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentCollections: RecentCollection[];
}

export interface ProductImage {
  id: string;
  baseUrl: string;
  previewUrl: string | null;
  sortOrder: number;
  isPrimary?: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  sceneTypes: string[];
  source: 'imported' | 'uploaded';
  analyzed: boolean;
  price: number;
  isFavorite: boolean;
  images: ProductImage[];
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCollection {
  id: string;
  name: string;
  status: 'draft' | 'generating' | 'completed';
  productCount: number;
  updatedAt: string;
}

export interface ProductWithAssets extends Product {
  baseImages: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  analysis: {
    productType: string;
    materials: string[];
    colors: string[];
    style: string[];
    dominantColorHex: string;
  };
  generatedAssets?: GeneratedAsset[];
  collections?: ProductCollection[];
  stats?: {
    totalGenerated: number;
    pinnedCount: number;
    approvedCount: number;
    pendingCount: number;
  };
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

export interface ProductsParams {
  search?: string;
  category?: string;
  sceneType?: string;
  source?: 'imported' | 'uploaded';
  analyzed?: boolean;
  sort?: 'name' | 'price' | 'category' | 'created' | 'updated';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateProductPayload {
  name: string;
  sku?: string;
  category?: string;
  sceneTypes?: string[];
  price?: number;
  description?: string;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  category?: string;
  sceneTypes?: string[];
  price?: number;
}

export interface Collection {
  id: string;
  name: string;
  status: 'draft' | 'generating' | 'completed';
  productCount: number;
  generatedCount: number;
  totalImages: number;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  productIds?: string[];
  inspirationImages?: string[];
  promptTags?: Partial<PromptTags>;
  // New settings structure
  settings?: {
    inspirationImages?: Array<{
      url: string;
      thumbnailUrl?: string;
      tags?: string[];
      addedAt: string;
      sourceType: 'upload' | 'library' | 'stock' | 'unsplash';
    }>;
    sceneTypeInspirations?: Record<
      string,
      {
        inspirationImages: Array<{
          url: string;
          thumbnailUrl?: string;
          tags?: string[];
          addedAt: string;
          sourceType: 'upload' | 'library' | 'stock' | 'unsplash';
        }>;
        mergedAnalysis: {
          json: Record<string, unknown>;
          promptText: string;
        };
      }
    >;
    stylePreset?: string;
    lightingPreset?: string;
    userPrompt?: string;
    aspectRatio?: ImageAspectRatio;
    imageQuality?: '1k' | '2k' | '4k';
    variantsCount?: number;
    video?: {
      prompt?: string;
      inspirationImageUrl?: string;
      inspirationNote?: string;
      settings?: {
        videoType?: string;
        cameraMotion?: string;
        aspectRatio?: '16:9' | '9:16';
        resolution?: '720p' | '1080p';
        sound?: 'with_music' | 'no_sound' | 'automatic' | 'custom';
        soundPrompt?: string;
      };
      presetId?: string | null;
    };
  };
}

export interface CollectionsResponse {
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CollectionsParams {
  search?: string;
  status?: 'all' | 'draft' | 'generating' | 'completed';
  sort?: 'recent' | 'name' | 'productCount';
  page?: number;
  limit?: number;
}

export interface CreateCollectionPayload {
  name: string;
  productIds: string[];
  inspirationImages?: Record<string, string>;
  promptTags?: Partial<PromptTags>;
}

export interface UpdateCollectionPayload {
  name?: string;
  status?: 'draft' | 'generating' | 'completed';
  productIds?: string[];
  inspirationImages?: Record<string, string>;
  promptTags?: Partial<PromptTags>;
  // New settings structure
  settings?: {
    inspirationImages?: Array<{
      url: string;
      thumbnailUrl?: string;
      tags?: string[];
      addedAt: string;
      sourceType: 'upload' | 'library' | 'stock' | 'unsplash';
    }>;
    sceneTypeInspirations?: Record<
      string,
      {
        inspirationImages: Array<{
          url: string;
          thumbnailUrl?: string;
          tags?: string[];
          addedAt: string;
          sourceType: 'upload' | 'library' | 'stock' | 'unsplash';
        }>;
        mergedAnalysis: {
          json: Record<string, unknown>;
          promptText: string;
        };
      }
    >;
    stylePreset?: string;
    lightingPreset?: string;
    userPrompt?: string;
    aspectRatio?: ImageAspectRatio;
    imageQuality?: '1k' | '2k' | '4k';
    variantsCount?: number;
    video?: {
      prompt?: string;
      inspirationImageUrl?: string;
      inspirationNote?: string;
      settings?: {
        videoType?: string;
        cameraMotion?: string;
        aspectRatio?: '16:9' | '9:16';
        resolution?: '720p' | '1080p';
        sound?: 'with_music' | 'no_sound' | 'automatic' | 'custom';
        soundPrompt?: string;
      };
      presetId?: string | null;
    };
  };
}

export interface GenerationFlow {
  id: string;
  type: 'single';
  productId: string;
  productName: string;
  mode: 'generate' | 'edit' | 'regenerate';
  status: string;
  settings: {
    aspectRatio: ImageAspectRatio;
    variantsCount: number;
    varietyLevel: number;
    matchProductColors: boolean;
  };
  promptTags: PromptTags;
  inspirationImages: string[];
  generatedAssets: GeneratedAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenerationFlowPayload {
  clientId?: string; // Optional - can be derived from auth
  productId: string;
  baseImageId?: string;
  productName?: string;
  mode?: 'generate' | 'edit';
}

export interface UpdateStudioSettingsPayload {
  // Scene Style (Section 1)
  inspirationImages?: Array<{
    url: string;
    thumbnailUrl?: string;
    tags?: string[];
    addedAt: string;
    sourceType: 'upload' | 'library' | 'stock' | 'unsplash';
  }>;
  sceneTypeInspirations?: Record<
    string,
    {
      inspirationImages: Array<{
        url: string;
        thumbnailUrl?: string;
        tags?: string[];
        addedAt: string;
        sourceType: 'upload' | 'library' | 'stock' | 'unsplash';
      }>;
      mergedAnalysis: {
        json: Record<string, unknown>;
        promptText: string;
      };
    }
  >;
  stylePreset?: string;
  lightingPreset?: string;
  sceneType?: string;

  // User Prompt (Section 3)
  userPrompt?: string;

  // Output Settings (Section 4)
  aspectRatio?: ImageAspectRatio;
  imageQuality?: '1k' | '2k' | '4k' | '1K' | '2K' | '4K';
  variantsCount?: number;
  video?: {
    prompt?: string;
    inspirationImageUrl?: string;
    inspirationNote?: string;
    settings?: {
      videoType?: string;
      cameraMotion?: string;
      aspectRatio?: '16:9' | '9:16';
      resolution?: '720p' | '1080p';
      sound?: 'with_music' | 'no_sound' | 'automatic' | 'custom';
      soundPrompt?: string;
    };
    presetId?: string | null;
  };

  // Legacy fields (for backward compat during transition)
  promptTags?: Partial<PromptTags>;
  customPrompt?: string;
  inspirationImageUrls?: string[];
  selectedBaseImageId?: string;
}

export interface StudioSettingsResponse {
  success: boolean;
  flowId: string;
  settings: Record<string, unknown>;
}

export interface GeneratedAsset {
  id: string;
  url: string;
  assetType?: 'image' | 'video' | '3d_model';
  productId: string;
  productName: string;
  collectionId: string;
  sceneType: string;
  rating: number;
  isPinned: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  status: 'pending' | 'generating' | 'completed' | 'error';
  createdAt: string;
  settings?: {
    aspectRatio?: ImageAspectRatio;
    imageQuality?: '1k' | '2k' | '4k';
  };
}

export interface GeneratedImagesResponse {
  images: GeneratedAsset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  filters: {
    sceneTypes: string[];
  };
}

export interface GeneratedImagesParams {
  /** Filter by generation flow ID */
  flowId?: string;
  productId?: string;
  productIds?: string[];
  pinned?: boolean;
  status?: 'pending' | 'generating' | 'completed' | 'error';
  approval?: 'pending' | 'approved' | 'rejected';
  sort?: 'date' | 'oldest';
  page?: number;
  limit?: number;
}

export interface GenerateImagesPayload {
  clientId?: string;
  sessionId: string;
  productIds: string[];
  promptTags?: Partial<PromptTags>;
  prompt?: string;
  /** Selected product image URLs (one per product) */
  productImageUrls?: string[];
  inspirationImageUrls?: string[];
  settings?: {
    aspectRatio?: ImageAspectRatio;
    imageQuality?: '1k' | '2k' | '4k';
    variantsPerProduct?: number;
  };
  urgent?: boolean;
}

export interface GenerateImagesResponse {
  jobId: string;
  jobIds: string[];
  status: 'queued';
  expectedImageCount: number;
  prompt: string;
  message: string;
  queueType: 'redis' | 'memory' | 'postgres';
}

export interface GenerateVideoPayload {
  clientId?: string;
  sessionId: string;
  productId: string;
  sourceImageUrl: string;
  prompt: string;
  inspirationNote?: string;
  settings?: {
    aspectRatio?: '16:9' | '9:16';
    resolution?: '720p' | '1080p';
    model?: string;
  };
  urgent?: boolean;
}

export interface GenerateVideoResponse {
  jobId: string;
  status: 'queued' | 'completed' | 'failed' | 'processing';
  message?: string;
  error?: string;
  queueType?: 'redis' | 'memory' | 'postgres';
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
  attempts?: number;
  maxAttempts?: number;
  videoIds?: string[];
}

export interface UploadResponse {
  url: string;
  key: string;
  filename: string;
  size: number;
  type: string;
}

export interface AnalyzeProductsPayload {
  products?: Array<{
    productId: string;
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    imageUrl?: string;
  }>;
  productIds?: string[];
  productImageUrls?: string[];
  inspirationImageUrls?: string[];
  useAI?: boolean;
}

export interface AnalyzeProductsResponse {
  productAnalyses?: Array<{
    productType: string;
    sceneTypes: string[];
    colorSchemes: Array<{ name: string; colors: string[] }>;
    materials: string[];
    size: { type: 'small' | 'medium' | 'large' };
    styles: string[];
    confidence: number;
    analysisMethod: string;
  }>;
  suggestedTags: Partial<PromptTags>;
  productAnalysis?: {
    style: string;
    sceneTypes: string[];
  };
  inspirationAnalysis?: {
    commonStyle: string;
    commonMood: string;
    commonLighting: string;
    suggestedPrompt: string;
  };
}

export interface AnalyzeImageResponse {
  success: boolean;
  components?: Array<{
    id: string;
    name: string;
    description: string;
    editPrompt?: string;
  }>;
  overallDescription?: string;
  suggestedAdjustments?: Array<{
    id: string;
    label: string;
    description: string;
    prompt: string;
    icon: 'sun' | 'palette' | 'contrast' | 'sparkles';
    category: string;
  }>;
  error?: string;
}

export interface EditImageResponse {
  success: boolean;
  editedImageDataUrl?: string;
  error?: string;
}

export interface RemoveBackgroundResponse {
  success: boolean;
  imageDataUrl?: string;
  error?: string;
}

export interface UpscaleImageResponse {
  success: boolean;
  imageDataUrl?: string;
  error?: string;
}

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  user: {
    name: string;
  };
}

export interface UnsplashSearchResponse {
  results: UnsplashImage[];
  total: number;
  total_pages: number;
}

// ===== API Client Class =====

class ApiClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error ?? `Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // ===== Dashboard =====
  async getDashboard(): Promise<DashboardResponse> {
    return this.request<DashboardResponse>('/api/dashboard');
  }

  // ===== Products =====
  async listProducts(params?: ProductsParams): Promise<ProductsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    if (params?.category) {
      searchParams.set('category', params.category);
    }
    if (params?.sceneType) {
      searchParams.set('sceneType', params.sceneType);
    }
    if (params?.source) {
      searchParams.set('source', params.source);
    }
    if (params?.analyzed !== undefined) {
      searchParams.set('analyzed', String(params.analyzed));
    }
    if (params?.sort) {
      searchParams.set('sort', params.sort);
    }
    if (params?.order) {
      searchParams.set('order', params.order);
    }
    if (params?.page) {
      searchParams.set('page', String(params.page));
    }
    if (params?.limit) {
      searchParams.set('limit', String(params.limit));
    }

    const query = searchParams.toString();
    return this.request<ProductsResponse>(`/api/products${query ? `?${query}` : ''}`);
  }

  async getProduct(productId: string, includeAssets = true): Promise<ProductWithAssets> {
    return this.request<ProductWithAssets>(
      `/api/products/${productId}?includeAssets=${includeAssets}`
    );
  }

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    return this.request<Product>('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updateProduct(productId: string, payload: UpdateProductPayload): Promise<Product> {
    return this.request<Product>(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async deleteProduct(productId: string): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(`/api/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async setPrimaryImage(
    productId: string,
    imageId: string
  ): Promise<{ success: boolean; image: { id: string; isPrimary: boolean; sortOrder: number } }> {
    return this.request(`/api/products/${productId}/images/${imageId}/primary`, {
      method: 'POST',
    });
  }

  // ===== Collections =====
  async listCollections(params?: CollectionsParams): Promise<CollectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.sort) {
      searchParams.set('sort', params.sort);
    }
    if (params?.page) {
      searchParams.set('page', String(params.page));
    }
    if (params?.limit) {
      searchParams.set('limit', String(params.limit));
    }

    const query = searchParams.toString();
    return this.request<CollectionsResponse>(`/api/collections${query ? `?${query}` : ''}`);
  }

  async getCollection(collectionId: string): Promise<Collection> {
    return this.request<Collection>(`/api/collections/${collectionId}`);
  }

  async createCollection(payload: CreateCollectionPayload): Promise<Collection> {
    return this.request<Collection>('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updateCollection(
    collectionId: string,
    payload: UpdateCollectionPayload
  ): Promise<Collection> {
    return this.request<Collection>(`/api/collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async deleteCollection(
    collectionId: string,
    options?: { assetPolicy?: 'delete_all' | 'keep_pinned_approved' }
  ): Promise<{ success: boolean; id: string }> {
    const body = options?.assetPolicy
      ? JSON.stringify({ assetPolicy: options.assetPolicy })
      : undefined;
    return this.request<{ success: boolean; id: string }>(`/api/collections/${collectionId}`, {
      method: 'DELETE',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body,
    });
  }

  async generateCollection(
    collectionId: string,
    options?: {
      productIds?: string[];
      settings?: Partial<UpdateStudioSettingsPayload>;
    }
  ): Promise<{
    success: boolean;
    jobId: string;
    jobIds?: string[]; // Array of job IDs, one per product
    flowIds: string[];
    flows: Array<{ flowId: string; productId: string }>;
    productCount: number;
    message: string;
  }> {
    return this.request(`/api/collections/${collectionId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
  }

  // ===== Collection Flows =====
  async getCollectionFlows(collectionId: string): Promise<{
    flows: Array<{
      id: string;
      productId: string;
      productName: string;
      productCategory?: string;
      productSceneTypes?: string[];
      status: string;
      settings: Record<string, unknown>;
      createdAt: string;
      updatedAt: string;
      baseImages: Array<{ id: string; url: string; isPrimary: boolean }>;
      generatedImages?: Array<{
        id: string;
        imageUrl: string;
        timestamp: Date;
        type: 'generated';
        status: string;
        approvalStatus: string;
        aspectRatio?: ImageAspectRatio;
        jobId?: string;
      }>;
    }>;
    total: number;
  }> {
    return this.request(`/api/collections/${collectionId}/flows`);
  }

  async createCollectionFlows(collectionId: string): Promise<{
    success: boolean;
    flows: Array<{ flowId: string; productId: string }>;
    created: number;
    total: number;
  }> {
    return this.request(`/api/collections/${collectionId}/flows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  }

  // ===== Studio Sessions =====
  async createGenerationFlow(payload: CreateGenerationFlowPayload): Promise<GenerationFlow> {
    return this.request<GenerationFlow>('/api/studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getGenerationFlowsByProductId(productId: string): Promise<{ flows: GenerationFlow[] }> {
    return this.request<{ flows: GenerationFlow[] }>(`/api/studio?productId=${productId}`);
  }

  async updateStudioSettings(
    studioId: string,
    payload: UpdateStudioSettingsPayload
  ): Promise<StudioSettingsResponse> {
    return this.request<StudioSettingsResponse>(`/api/studio/${studioId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updateFlowBaseImages(
    flowId: string,
    selectedBaseImages: Record<string, string>
  ): Promise<StudioSettingsResponse> {
    return this.request<StudioSettingsResponse>(`/api/studio/${flowId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedBaseImages }),
    });
  }

  async getStudioSettings(studioId: string): Promise<StudioSettingsResponse> {
    return this.request<StudioSettingsResponse>(`/api/studio/${studioId}/settings`);
  }

  // ===== Image Generation =====
  async generateImages(payload: GenerateImagesPayload): Promise<GenerateImagesResponse> {
    return this.request<GenerateImagesResponse>('/api/generate-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async generateVideo(payload: GenerateVideoPayload): Promise<GenerateVideoResponse> {
    return this.request<GenerateVideoResponse>('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return this.request<JobStatus>(`/api/jobs/${jobId}`, { cache: 'no-store' });
  }

  // ===== Generated Images / Assets =====
  async listGeneratedImages(params?: GeneratedImagesParams): Promise<GeneratedImagesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.flowId) {
      searchParams.set('flowId', params.flowId);
    }
    if (params?.productId) {
      searchParams.set('productId', params.productId);
    }
    if (params?.productIds && params.productIds.length > 0) {
      searchParams.set('productIds', params.productIds.join(','));
    }
    if (params?.pinned !== undefined) {
      searchParams.set('pinned', String(params.pinned));
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    if (params?.approval) {
      searchParams.set('approval', params.approval);
    }
    if (params?.sort) {
      searchParams.set('sort', params.sort);
    }
    if (params?.page) {
      searchParams.set('page', String(params.page));
    }
    if (params?.limit) {
      searchParams.set('limit', String(params.limit));
    }

    const query = searchParams.toString();
    return this.request<GeneratedImagesResponse>(
      `/api/generated-images${query ? `?${query}` : ''}`
    );
  }

  // Alias for assets page - returns same data with assets wrapper
  async getGeneratedAssets(params?: {
    sort?: string;
    limit?: number;
  }): Promise<{ assets: GeneratedAsset[] }> {
    const result = await this.listGeneratedImages({
      sort: params?.sort === 'recent' ? 'date' : params?.sort === 'oldest' ? 'oldest' : undefined,
      limit: params?.limit,
    });
    return { assets: result.images };
  }

  async deleteGeneratedImage(id: string): Promise<{ success: boolean; deletedId: string }> {
    return this.request<{ success: boolean; deletedId: string }>('/api/generated-images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  }

  async togglePinImage(id: string): Promise<{ success: boolean; isPinned: boolean }> {
    return this.request<{ success: boolean; isPinned: boolean }>(
      `/api/generated-images/${id}/pin`,
      {
        method: 'POST',
      }
    );
  }

  async updateImageApproval(
    id: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<{ success: boolean; approvalStatus: string }> {
    return this.request<{ success: boolean; approvalStatus: string }>(
      `/api/generated-images/${id}/approval`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }
    );
  }

  // Alias methods for cleaner API
  async getProducts(params?: ProductsParams): Promise<ProductsResponse> {
    return this.listProducts(params);
  }

  async getCollections(params?: CollectionsParams): Promise<CollectionsResponse> {
    return this.listCollections(params);
  }

  // ===== File Upload =====
  async uploadFile(
    file: File,
    type?: 'product' | 'collection' | 'inspiration',
    options?: { productId?: string; collectionId?: string }
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (type) {
      formData.append('type', type);
    }
    if (options?.productId) {
      formData.append('productId', options.productId);
    }
    if (options?.collectionId) {
      formData.append('collectionId', options.collectionId);
    }

    return this.request<UploadResponse>('/api/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // ===== Product Analysis =====
  async analyzeProducts(payload: AnalyzeProductsPayload): Promise<AnalyzeProductsResponse> {
    return this.request<AnalyzeProductsResponse>('/api/analyze-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // ===== Image Editing =====
  async analyzeImage(imageDataUrl: string): Promise<AnalyzeImageResponse> {
    return this.request<AnalyzeImageResponse>('/api/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl }),
    });
  }

  async editImage(baseImageDataUrl: string, prompt: string): Promise<EditImageResponse> {
    return this.request<EditImageResponse>('/api/edit-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseImageDataUrl, prompt }),
    });
  }

  async removeBackground(
    imageDataUrl: string,
    keepShadow = true
  ): Promise<RemoveBackgroundResponse> {
    return this.request<RemoveBackgroundResponse>('/api/remove-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl, keepShadow }),
    });
  }

  async upscaleImage(
    imageDataUrl: string,
    targetResolution: '2k' | '4k'
  ): Promise<UpscaleImageResponse> {
    return this.request<UpscaleImageResponse>('/api/upscale-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl, targetResolution }),
    });
  }

  // ===== Explore (Unsplash) =====
  async searchExplore(query: string, page = 1, perPage = 12): Promise<UnsplashSearchResponse> {
    const searchParams = new URLSearchParams({
      q: query,
      page: String(page),
      per_page: String(perPage),
    });
    return this.request<UnsplashSearchResponse>(`/api/explore/search?${searchParams}`);
  }
}

export const apiClient = new ApiClient();
