import type { Client, Product } from '@/lib/types/app-types';
import type { SortOption } from './constants';

export type ProductCategoryKey = string | 'uncategorized';

export interface StudioProductsViewModel {
  client: Client | null;
  products: Product[];
  productsByCategory: { category: ProductCategoryKey; products: Product[] }[];
  categoryOptions: ProductCategoryKey[];
  searchQuery: string;
  categoryFilter: ProductCategoryKey | 'all';
  sortBy: SortOption;
  selectedProductIds: Set<string>;
  expandedProductIds: Set<string>;
  isMultiSelectMode: boolean;
}

export interface ProductDragData {
  productId: string;
  imageId: string;
}

export interface MultiProductDragData {
  products: ProductDragData[];
  sourceType: 'panel';
}
