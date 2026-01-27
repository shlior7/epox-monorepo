import type { Client, ClientSession } from '@/lib/types/app-types';

export interface ClientSessionsViewModel {
  client: Client | null;
  sessions: ClientSession[];
  isSelectingProducts: boolean;
  selectedProducts: Set<string>;
  isBulkDeleteMode: boolean;
  selectedForDelete: Set<string>;
}
