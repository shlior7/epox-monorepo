import type { Product, Session } from '@/lib/types/app-types';

export interface SessionsViewModel {
  product: Product | null;
  sessions: Session[];
  isBulkDeleteMode: boolean;
  selectedForDelete: Set<string>;
  menuOpen: string | null;
}
