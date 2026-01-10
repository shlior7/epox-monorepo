import type { Client, Product } from '@/lib/types/app-types';

export interface ProductsViewModel {
  client: Client | null;
  products: Product[];
  isSelectingProducts: boolean;
  isBulkDeleteMode: boolean;
  selectedForSession: Set<string>;
  selectedForDelete: Set<string>;
}
