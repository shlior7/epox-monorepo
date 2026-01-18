/**
 * Database Service - Re-exports from shared visualizer-db
 * All database operations should go through the db facade.
 * Do NOT use getDb directly - use the repository methods instead.
 */

export { db, createDatabaseFacade } from 'visualizer-db';
export type { DatabaseFacade } from 'visualizer-db';
