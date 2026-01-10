import type { DrizzleClient } from './client';
import { getDb } from './client';
import type { ClientSessionRepository, OrganizationRepository } from './repositories/index';
import {
  AdminUserRepository,
  AccountRepository,
  ChatSessionRepository,
  ClientRepository,
  FavoriteImageRepository,
  FlowRepository,
  GeneratedImageRepository,
  MemberRepository,
  MessageRepository,
  ProductImageRepository,
  ProductRepository,
  StudioSessionRepository,
  UserRepository,
} from './repositories/index';

/**
 * Database facade interface - provides typed access to all repositories.
 */
export interface DatabaseFacade {
  readonly adminUsers: AdminUserRepository;
  readonly accounts: AccountRepository;
  readonly users: UserRepository;
  readonly clients: ClientRepository;
  readonly members: MemberRepository;
  readonly products: ProductRepository;
  readonly productImages: ProductImageRepository;
  readonly chatSessions: ChatSessionRepository;
  readonly studioSessions: StudioSessionRepository;
  readonly messages: MessageRepository;
  readonly flows: FlowRepository;
  readonly generatedImages: GeneratedImageRepository;
  readonly favoriteImages: FavoriteImageRepository;
  readonly organizations: OrganizationRepository;
  readonly clientSessions: ClientSessionRepository;
  /**
   * Execute multiple operations in a transaction.
   *
   * NOTE: Transactions require a driver that supports them (e.g., pooled WebSocket driver).
   * If the underlying driver doesn't support transactions, operations will run without
   * transaction isolation.
   */
  transaction: <T>(fn: (tx: DatabaseFacade) => Promise<T>) => Promise<T>;
}

/**
 * Create a database facade with all repositories.
 */
export function createDatabaseFacade(drizzle: DrizzleClient): DatabaseFacade {
  const adminUsers = new AdminUserRepository(drizzle);
  const accounts = new AccountRepository(drizzle);
  const users = new UserRepository(drizzle);
  const clients = new ClientRepository(drizzle);
  const members = new MemberRepository(drizzle);
  const products = new ProductRepository(drizzle);
  const productImages = new ProductImageRepository(drizzle);
  const chatSessions = new ChatSessionRepository(drizzle);
  const studioSessions = new StudioSessionRepository(drizzle);
  const messages = new MessageRepository(drizzle);
  const flows = new FlowRepository(drizzle);
  const generatedImages = new GeneratedImageRepository(drizzle);
  const favoriteImages = new FavoriteImageRepository(drizzle);
  const organizations = clients;
  const clientSessions = studioSessions;

  async function transaction<T>(fn: (tx: DatabaseFacade) => Promise<T>): Promise<T> {
    // Check if the drizzle client supports transactions
    const drizzleAny = drizzle as unknown as Record<string, unknown>;
    if (typeof drizzleAny.transaction !== 'function') {
      // Fallback: execute without transaction wrapper
      console.warn(
        '[visualizer-db] Transaction requested but driver does not support transactions. ' +
          'Operations will run without transaction isolation.'
      );
      return fn(createDatabaseFacade(drizzle));
    }

    // Use the drizzle transaction
    type TransactionFn = <T>(fn: (tx: DrizzleClient) => Promise<T>) => Promise<T>;
    try {
      return await (drizzleAny.transaction as TransactionFn)(async (tx) => {
        return fn(createDatabaseFacade(tx));
      });
    } catch (error) {
      if (isUnsupportedTransactionError(error)) {
        console.warn(
          '[visualizer-db] Transaction requested but driver does not support transactions. ' +
            'Operations will run without transaction isolation.'
        );
        return fn(createDatabaseFacade(drizzle));
      }
      throw error;
    }
  }

  return {
    adminUsers,
    accounts,
    users,
    clients,
    members,
    products,
    productImages,
    chatSessions,
    studioSessions,
    messages,
    flows,
    generatedImages,
    favoriteImages,
    organizations,
    clientSessions,
    transaction,
  };
}

/**
 * Singleton database facade instance (lazy initialization).
 */
let _dbFacade: DatabaseFacade | null = null;

export const db: DatabaseFacade = new Proxy({} as DatabaseFacade, {
  get(_, prop) {
    _dbFacade ??= createDatabaseFacade(getDb());
    return _dbFacade[prop as keyof DatabaseFacade];
  },
});

function isUnsupportedTransactionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes('no transactions support') && message.includes('neon-http');
}
