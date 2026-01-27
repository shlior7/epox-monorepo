/**
 * Test client configuration data
 * Feature-based test clients for optimal test organization and parallelization
 *
 * Each feature (collections, products, store, studio) has its own dedicated client.
 * This allows:
 * - Different features to run in parallel (fast execution)
 * - Tests within a feature to run sequentially (shared state)
 * - Minimal containers (one per feature)
 * - Maximum coverage (complete user flows)
 */

export type TestClientId =
  | 'test-client-collections'
  | 'test-client-products'
  | 'test-client-store'
  | 'test-client-studio'
  | 'test-client-main'; // Legacy client for backwards compatibility

export interface TestClientConfig {
  id: TestClientId;
  name: string;
  slug: string;
  email: string;
  password: string;
  userName: string;
  products?: Array<{
    name: string;
    description: string;
    category: string;
  }>;
  collections?: Array<{
    name: string;
    status: string;
  }>;
}

export const TEST_CLIENTS: TestClientConfig[] = [
  // Collections feature client
  {
    id: 'test-client-collections',
    name: 'Collections Test Workspace',
    slug: 'test-collections',
    email: 'test-collections@epox.test',
    password: 'TestPassword123!',
    userName: 'test-collections',
  },

  // Products feature client
  {
    id: 'test-client-products',
    name: 'Products Test Workspace',
    slug: 'test-products',
    email: 'test-products@epox.test',
    password: 'TestPassword123!',
    userName: 'test-products',
  },

  // Store feature client
  {
    id: 'test-client-store',
    name: 'Store Test Workspace',
    slug: 'test-store',
    email: 'test-store@epox.test',
    password: 'TestPassword123!',
    userName: 'test-store',
  },

  // Studio feature client
  {
    id: 'test-client-studio',
    name: 'Studio Test Workspace',
    slug: 'test-studio',
    email: 'test-studio@epox.test',
    password: 'TestPassword123!',
    userName: 'test-studio',
  },

  // Main client (legacy - for backwards compatibility with existing tests)
  {
    id: 'test-client-main',
    name: 'Main Test Workspace',
    slug: 'test-main',
    email: 'test-main@epox.test',
    password: 'TestPassword123!',
    userName: 'test-main',
  },
] as const;

/**
 * Get test client by ID
 */
export function getTestClient(id: TestClientId): TestClientConfig {
  const client = TEST_CLIENTS.find(c => c.id === id);
  if (!client) {
    throw new Error(`Test client not found: ${id}`);
  }
  return client;
}

/**
 * Get test client by feature name
 */
export function getTestClientByFeature(feature: 'collections' | 'products' | 'store' | 'studio' | 'main'): TestClientConfig {
  const id: TestClientId = `test-client-${feature}`;
  return getTestClient(id);
}
