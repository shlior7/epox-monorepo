import type { Client } from '@/lib/types/app-types';

export interface ClientsViewModel {
  rows: Client[];
  isBulkDeleteMode: boolean;
  selectedForDelete: Set<string>;
}
