/**
 * ERP Service Wrapper
 * Provides access to the store service for store connections and product imports
 */

import { createStoreService, type StoreService } from 'erp-service';
import { db } from './db';

let _storeService: StoreService | null = null;

/** Get the store service singleton */
export function getStoreService(): StoreService {
  if (!_storeService) {
    _storeService = createStoreService(db);
  }
  return _storeService;
}

// Re-export for convenience
export { type StoreService };
