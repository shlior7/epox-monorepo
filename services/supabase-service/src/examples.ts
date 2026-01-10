/**
 * Database Service Examples
 *
 * This file shows how to use the database service for common operations.
 * These examples can be used as reference for implementing database operations
 * in your application.
 */

import { db } from './database-service';

// =============================================================================
// TABLE OPERATIONS EXAMPLES
// =============================================================================

/**
 * Example: Get all clients with pagination and filtering
 */
export async function getClientsExample() {
  const { data, error, count } = await db.tables.getRecords('Clients', {
    select: 'id, name, email, status, created_at',
    filters: [
      { column: 'status', operator: 'eq', value: 'active' },
      { column: 'created_at', operator: 'gte', value: '2024-01-01' },
    ],
    orderBy: { column: 'created_at', ascending: false },
    limit: 10,
    offset: 0,
  });

  if (error) {
    console.error('Failed to fetch clients:', error);
    return null;
  }

  console.log(`Found ${count} clients:`, data);
  return data;
}

/**
 * Example: Get a single client by ID
 */
export async function getClientExample(clientId: string) {
  const { data, error } = await db.tables.getRecord('Clients', clientId);

  if (error) {
    console.error('Failed to fetch client:', error);
    return null;
  }

  return data;
}

/**
 * Example: Create a new client
 */
export async function createClientExample() {
  const newClient = {
    name: 'Acme Corp',
    email: 'contact@acme.com',
    status: 'active',
    settings: {
      theme: 'dark',
      notifications: true,
    },
  };

  const { data, error } = await db.tables.createRecord('Clients', newClient);

  if (error) {
    console.error('Failed to create client:', error);
    return null;
  }

  console.log('Created client:', data);
  return data;
}

/**
 * Example: Update a client
 */
export async function updateClientExample(clientId: string) {
  const updates = {
    status: 'inactive',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db.tables.updateRecord('Clients', clientId, updates);

  if (error) {
    console.error('Failed to update client:', error);
    return null;
  }

  console.log('Updated client:', data);
  return data;
}

/**
 * Example: Bulk update clients
 */
export async function bulkUpdateClientsExample() {
  const { data, error, count } = await db.tables.updateRecords('Clients', { status: 'migrated' }, [
    { column: 'created_at', operator: 'lt', value: '2023-01-01' },
  ]);

  if (error) {
    console.error('Failed to bulk update clients:', error);
    return null;
  }

  console.log(`Updated ${count} clients:`, data);
  return data;
}

/**
 * Example: Delete a client
 */
export async function deleteClientExample(clientId: string) {
  const { data, error } = await db.tables.deleteRecord('Clients', clientId);

  if (error) {
    console.error('Failed to delete client:', error);
    return false;
  }

  console.log('Deleted client:', data);
  return true;
}

/**
 * Example: Upsert a client (insert or update)
 */
export async function upsertClientExample() {
  const clientData = {
    id: 'client-123',
    name: 'Updated Acme Corp',
    email: 'new-contact@acme.com',
    status: 'active',
  };

  const { data, error } = await db.tables.upsertRecord('Clients', clientData, 'id');

  if (error) {
    console.error('Failed to upsert client:', error);
    return null;
  }

  console.log('Upserted client:', data);
  return data;
}

/**
 * Example: Count records with filters
 */
export async function countActiveClientsExample() {
  const { count, error } = await db.tables.countRecords('Clients', [{ column: 'status', operator: 'eq', value: 'active' }]);

  if (error) {
    console.error('Failed to count clients:', error);
    return null;
  }

  console.log(`Active clients count: ${count}`);
  return count;
}

// =============================================================================
// SECRETS OPERATIONS EXAMPLES
// =============================================================================

/**
 * Example: Store API credentials as a secret
 */
export async function createApiCredentialsExample() {
  const credentials = {
    username: 'api_user',
    password: 'super_secret_password',
    apiKey: 'sk-1234567890abcdef',
    baseUrl: 'https://api.example.com',
  };

  const { success, error } = await db.secrets.createSecret('example_api_credentials', credentials, {
    description: 'API credentials for Example service',
  });

  if (!success) {
    console.error('Failed to create secret:', error);
    return false;
  }

  console.log('Successfully created API credentials secret');
  return true;
}

/**
 * Example: Retrieve API credentials
 */
export async function getApiCredentialsExample() {
  const { data, error } = await db.secrets.getSecret('example_api_credentials');

  if (error) {
    console.error('Failed to retrieve secret:', error);
    return null;
  }

  const credentials = data as {
    username: string;
    password: string;
    apiKey: string;
    baseUrl: string;
  };

  console.log('Retrieved credentials for user:', credentials.username);
  return credentials;
}

/**
 * Example: Update secret
 */
export async function updateApiCredentialsExample() {
  const newCredentials = {
    username: 'api_user_v2',
    password: 'new_super_secret_password',
    apiKey: 'sk-new1234567890abcdef',
    baseUrl: 'https://api-v2.example.com',
  };

  const { success, error } = await db.secrets.updateSecret('example_api_credentials', newCredentials);

  if (!success) {
    console.error('Failed to update secret:', error);
    return false;
  }

  console.log('Successfully updated API credentials');
  return true;
}

/**
 * Example: List all secrets (metadata only)
 */
export async function listSecretsExample() {
  const { data, error } = await db.secrets.listSecrets();

  if (error) {
    console.error('Failed to list secrets:', error);
    return null;
  }

  console.log('Available secrets:');
  data?.forEach((secret) => {
    console.log(`- ${secret.name}: ${secret.description || 'No description'}`);
  });

  return data;
}

/**
 * Example: Rotate a secret (get old value and set new one)
 */
export async function rotateSecretExample() {
  const newPassword = `pwd_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const { success, oldValue, error } = await db.secrets.rotateSecret('example_api_credentials', {
    username: 'api_user',
    password: newPassword,
    apiKey: 'sk-rotated1234567890abcdef',
    baseUrl: 'https://api.example.com',
  });

  if (!success) {
    console.error('Failed to rotate secret:', error);
    return false;
  }

  console.log('Secret rotated successfully');
  console.log('Old password was:', (oldValue as any)?.password);
  console.log('New password is:', newPassword);
  return true;
}

/**
 * Example: Batch operations on secrets
 */
export async function batchSecretsExample() {
  const operations = [
    {
      type: 'create' as const,
      name: 'test_secret_1',
      secret: { value: 'test1' },
      options: { description: 'Test secret 1' },
    },
    {
      type: 'create' as const,
      name: 'test_secret_2',
      secret: { value: 'test2' },
      options: { description: 'Test secret 2' },
    },
    {
      type: 'update' as const,
      name: 'existing_secret',
      secret: { value: 'updated_value' },
    },
  ];

  const { success, results, error } = await db.secrets.batchOperation(operations);

  if (!success) {
    console.error('Batch operation failed:', error);
  }

  console.log('Batch operation results:');
  results.forEach((result) => {
    console.log(`- ${result.name}: ${result.success ? 'Success' : `Failed: ${result.error}`}`);
  });

  return results;
}

/**
 * Example: Get client credentials (specific format)
 */
export async function getClientCredentialsExample(secretName: string) {
  const { data, error } = await db.secrets.getClientCredentials(secretName);

  if (error) {
    console.error('Failed to get client credentials:', error);
    return null;
  }

  console.log(`Retrieved credentials for: ${data?.username}`);
  return data;
}

// =============================================================================
// DATABASE HEALTH AND INFO EXAMPLES
// =============================================================================

/**
 * Example: Check database health
 */
export async function checkDatabaseHealthExample() {
  const health = await db.healthCheck();

  console.log(`Database status: ${health.status}`);
  console.log(`Message: ${health.message}`);

  return health;
}

/**
 * Example: Get database information
 */
export async function getDatabaseInfoExample() {
  const info = await db.getDatabaseInfo();

  console.log(`Database connection: ${info.connection}`);
  console.log(`Database version: ${info.version}`);
  console.log(`Available tables: ${info.tables.join(', ')}`);

  return info;
}

// =============================================================================
// ADVANCED EXAMPLES
// =============================================================================

/**
 * Example: Complex query with multiple filters and joins
 */
export async function complexQueryExample() {
  // This would typically be done with a custom RPC function in Supabase
  // for complex joins and aggregations
  const { data, error } = await db.tables.executeQuery(
    `
    SELECT 
      c.id,
      c.name,
      c.email,
      COUNT(o.id) as order_count,
      SUM(o.total) as total_spent
    FROM clients c
    LEFT JOIN orders o ON c.id = o.client_id
    WHERE c.status = $1
    GROUP BY c.id, c.name, c.email
    ORDER BY total_spent DESC
    LIMIT $2
  `,
    ['active', 10]
  );

  if (error) {
    console.error('Failed to execute complex query:', error);
    return null;
  }

  console.log('Top clients by spending:', data);
  return data;
}

/**
 * Example: Transaction-like bulk operations
 */
export async function transactionExample() {
  const operations = [
    {
      type: 'insert' as const,
      tableName: 'clients',
      data: { name: 'New Client', email: 'new@example.com' },
    },
    {
      type: 'update' as const,
      tableName: 'clients',
      data: { status: 'updated' },
      filters: [{ column: 'id', operator: 'eq' as const, value: 'existing-id' }],
    },
    {
      type: 'delete' as const,
      tableName: 'old_records',
      filters: [{ column: 'created_at', operator: 'lt' as const, value: '2023-01-01' }],
    },
  ];

  const { success, error, results } = await db.tables.bulkOperation(operations);

  if (!success) {
    console.error('Transaction failed:', error);
    return false;
  }

  console.log('Transaction completed successfully:', results);
  return true;
}
