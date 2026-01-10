/**
 * WooCommerce Provider Implementation
 * Implements the ERPProvider interface for WooCommerce stores
 */

import { createWooCommerceApi } from '@scenergy/woo-commerce-sdk';
import type  WooCommerceRestApi  from '@woocommerce/woocommerce-rest-api';
import type {
  ERPProvider,
  ERPProviderType,
  WooCommerceCredentials,
  ProviderProduct,
  ProviderProductImage,
  ProviderCategory,
  ProductFetchOptions,
  ProductFetchResult,
  CategoryFetchResult,
} from '../types/provider';

// WooCommerce product from API
interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  status: string;
  type: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: string;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

// WooCommerce category from API
interface WooCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export class WooCommerceProvider implements ERPProvider {
  readonly providerType: ERPProviderType = 'woocommerce';
  readonly providerName = 'WooCommerce';

  private api: WooCommerceRestApi;
  private credentials: WooCommerceCredentials;

  constructor(credentials: WooCommerceCredentials) {
    this.credentials = credentials;
    this.api = createWooCommerceApi({
      url: credentials.baseUrl,
      consumerKey: credentials.consumerKey,
      consumerSecret: credentials.consumerSecret,
    });
  }

  /**
   * Fetch products from WooCommerce
   */
  async getProducts(options: ProductFetchOptions = {}): Promise<ProductFetchResult> {
    const {
      limit = 10,
      productIds,
      category,
      status = 'publish',
      search,
      page = 1,
    } = options;

    // Build query params
    const params: Record<string, string | number | number[]> = {
      per_page: Math.min(limit, 100), // WooCommerce max is 100
      page,
      status,
    };

    if (productIds && productIds.length > 0) {
      params.include = productIds.map((id) => (typeof id === 'string' ? parseInt(id, 10) : id));
    }

    if (category) {
      params.category = category;
    }

    if (search) {
      params.search = search;
    }

    try {
      const response = await this.api.get('products', params);
      const products: WooProduct[] = response.data;
      const total = parseInt(response.headers['x-wp-total'] ?? '0', 10);
      const totalPages = parseInt(response.headers['x-wp-totalpages'] ?? '1', 10);  
      return {
        products: products.map(this.mapProduct),
        total,
        page,
        hasMore: page < totalPages,
      };
    } catch (error) {
      console.error('WooCommerce getProducts error:', error);
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch a single product by ID
   */
  async getProductById(productId: string | number): Promise<ProviderProduct | null> {
    try {
      const response = await this.api.get(`products/${productId}`);
      const product: WooProduct = response.data;
      return this.mapProduct(product);
    } catch (error) {
      console.error('WooCommerce getProductById error:', error);
      return null;
    }
  }

  /**
   * Fetch all categories
   */
  async getCategories(): Promise<CategoryFetchResult> {
    try {
      const response = await this.api.get('products/categories', {
        per_page: 100,
        hide_empty: true,
      });

      const categories: WooCategory[] = response.data;

      return {
        categories: categories.map(this.mapCategory),
        total: categories.length,
      };
    } catch (error) {
      console.error('WooCommerce getCategories error:', error);
      throw new Error(`Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test the connection to WooCommerce
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch system status or a single product
      await this.api.get('products', { per_page: 1 });
      return true;
    } catch (error) {
      console.error('WooCommerce connection test failed:', error);
      return false;
    }
  }

  /**
   * Download an image from URL
   */
  async downloadImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('WooCommerce downloadImage error:', error);
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map WooCommerce product to provider product
   */
  private mapProduct = (product: WooProduct): ProviderProduct => {
    return {
      id: product.id,
      name: product.name,
      description: this.stripHtml(product.description),
      shortDescription: this.stripHtml(product.short_description),
      sku: product.sku,
      status: product.status,
      type: product.type,
      images: product.images.map(this.mapImage),
      categories: product.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      })),
    };
  };

  /**
   * Map WooCommerce image to provider image
   */
  private mapImage = (image: WooProduct['images'][0]): ProviderProductImage => {
    return {
      id: image.id,
      src: image.src,
      alt: image.alt,
      name: image.name,
    };
  };

  /**
   * Map WooCommerce category to provider category
   */
  private mapCategory = (category: WooCategory): ProviderCategory => {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      count: category.count,
    };
  };

  /**
   * Strip HTML tags from string
   */
  private stripHtml(html: string): string {
    return html.replaceAll(/<[^>]*>/g, '').trim();
  }
}

/**
 * Factory function to create WooCommerce provider
 */
export function createWooCommerceProvider(credentials: WooCommerceCredentials): ERPProvider {
  return new WooCommerceProvider(credentials);
}

/**
 * Validate WooCommerce credentials
 */
export function isWooCommerceCredentials(credentials: unknown): credentials is WooCommerceCredentials {
  if (!credentials || typeof credentials !== 'object') {return false;}
  const creds = credentials as Record<string, unknown>;
  return (
    typeof creds.baseUrl === 'string' &&
    typeof creds.consumerKey === 'string' &&
    typeof creds.consumerSecret === 'string'
  );
}
