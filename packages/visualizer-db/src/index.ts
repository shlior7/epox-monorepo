export { db, createDatabaseFacade, type DatabaseFacade } from './facade';
export { getDb, resetDb, type DrizzleClient } from './client';
export * from './types';
export * from './errors';
export * from './utils/prompt-resolver';

// Store connection repository types
export {
  type StoreConnectionRow,
  type StoreConnectionInfo,
  type StoreConnectionCreate,
  type StoreConnectionUpdate,
  type EncryptedCredentials,
  type StoreType,
  type ConnectionStatus,
} from './repositories/store-connections';
