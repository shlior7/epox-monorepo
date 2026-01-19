/**
 * Base Provider - Abstract class for all commerce providers
 */

export type ProviderType = 'woocommerce' | 'shopify' | 'bigcommerce';
export type ConnectionStatus = 'active' | 'disconnected' | 'error';

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  authMethod: 'oauth' | 'api_key';
  callbackMethod?: 'POST' | 'GET';
  scopes: string[];
}

export interface ProviderCredentials {
  baseUrl: string;
  [key: string]: unknown;
}

export interface ProviderProduct {
  id: string | number;
  name: string;
  description: string;
  shortDescription?: string;
  sku?: string;
  status: string;
  type?: string;
  images: Array<{ id: string | number; src: string; alt?: string }>;
  categories: Array<{ id: string | number; name: string; slug: string }>;
}

export interface ProviderCategory {
  id: string | number;
  name: string;
  slug: string;
  count?: number;
}

export interface AuthState {
  id: string;
  clientId: string;
  provider: ProviderType;
  storeUrl: string;
  createdAt: Date;
  expiresAt: Date;
  returnUrl?: string;
}

export interface AuthParams {
  clientId: string;
  storeUrl: string;
  appName: string;
  callbackUrl: string;
  returnUrl?: string;
}

export interface FetchOptions {
  limit?: number;
  page?: number;
  search?: string;
  category?: string;
  ids?: Array<string | number>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

export abstract class BaseProvider {
  abstract readonly config: ProviderConfig;

  abstract buildAuthUrl(params: AuthParams, stateId: string): string;
  abstract parseCallback(payload: unknown, state: AuthState): Promise<ProviderCredentials>;
  abstract testConnection(credentials: ProviderCredentials): Promise<boolean>;
  abstract getProducts(credentials: ProviderCredentials, options?: FetchOptions): Promise<PaginatedResult<ProviderProduct>>;
  abstract getProduct(credentials: ProviderCredentials, productId: string | number): Promise<ProviderProduct | null>;
  abstract getCategories(credentials: ProviderCredentials): Promise<ProviderCategory[]>;

  createAuthState(params: AuthParams, stateId: string, expiresAt: Date): AuthState {
    return {
      id: stateId,
      clientId: params.clientId,
      provider: this.config.type,
      storeUrl: this.normalizeUrl(params.storeUrl),
      createdAt: new Date(),
      expiresAt,
      returnUrl: params.returnUrl,
    };
  }

  async downloadImage(imageUrl: string): Promise<Buffer> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  protected normalizeUrl(url: string): string {
    let normalized = url.replace(/\/+$/, '');
    // Upgrade http:// to https://
    if (normalized.startsWith('http://')) {
      normalized = normalized.replace('http://', 'https://');
    } else if (!normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    return normalized;
  }

  protected stripHtml(html: string): string {
    return html.replaceAll(/<[^>]*>/g, '').trim();
  }
}
