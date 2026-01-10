# Database Service

A comprehensive database service for Supabase that provides easy-to-use methods for managing tables and secrets.

## Features

- **Table Operations**: Complete CRUD operations with filtering, pagination, and sorting
- **Secrets Management**: Secure storage and retrieval of sensitive data using Supabase Vault
- **Type Safety**: Full TypeScript support with proper type definitions
- **Error Handling**: Consistent error handling across all operations
- **Utilities**: Helper functions for common database tasks
- **Examples**: Comprehensive examples for all operations

## Quick Start

```typescript
import { db } from '@/lib/db/database-service';

// Get records with filtering and pagination
const { data, error, count } = await db.tables.getRecords('clients', {
  filters: [{ column: 'status', operator: 'eq', value: 'active' }],
  orderBy: { column: 'created_at', ascending: false },
  limit: 10,
});

// Store a secret
await db.secrets.createSecret('api_key', {
  username: 'user',
  password: 'secret',
});

// Retrieve a secret
const { data: credentials } = await db.secrets.getSecret('api_key');
```

## Table Operations

### Basic CRUD

```typescript
// Get all records
const { data, error } = await db.tables.getRecords('users');

// Get single record
const { data: user } = await db.tables.getRecord('users', 'user-id');

// Create record
const { data: newUser } = await db.tables.createRecord('users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// Update record
const { data: updatedUser } = await db.tables.updateRecord('users', 'user-id', {
  name: 'Jane Doe',
});

// Delete record
const { data: deletedUser } = await db.tables.deleteRecord('users', 'user-id');
```

### Filtering and Querying

```typescript
const { data, error, count } = await db.tables.getRecords('products', {
  select: 'id, name, price, category',
  filters: [
    { column: 'category', operator: 'eq', value: 'electronics' },
    { column: 'price', operator: 'gte', value: 100 },
    { column: 'name', operator: 'ilike', value: '%phone%' },
  ],
  orderBy: { column: 'price', ascending: false },
  limit: 20,
  offset: 0,
});
```

### Bulk Operations

```typescript
// Create multiple records
const { data } = await db.tables.createRecords('users', [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
]);

// Update multiple records
const { data, count } = await db.tables.updateRecords('users', { status: 'verified' }, [
  { column: 'email_verified', operator: 'eq', value: true },
]);

// Delete multiple records
const { data, count } = await db.tables.deleteRecords('users', [{ column: 'last_login', operator: 'lt', value: '2023-01-01' }]);
```

### Upsert Operations

```typescript
// Insert or update based on conflict
const { data } = await db.tables.upsertRecord(
  'settings',
  {
    user_id: 'user-123',
    theme: 'dark',
    notifications: true,
  },
  'user_id'
);
```

## Secrets Management

### Basic Secrets Operations

```typescript
// Create a secret
await db.secrets.createSecret('database_url', 'postgresql://...', {
  description: 'Main database connection string',
});

// Get a secret (automatically parses JSON)
const { data } = await db.secrets.getSecret('api_credentials');

// Update a secret
await db.secrets.updateSecret('api_credentials', {
  username: 'new_user',
  password: 'new_password',
});

// Delete a secret
await db.secrets.deleteSecret('old_api_key');
```

### Advanced Secrets Operations

```typescript
// List all secrets (metadata only)
const { data: secrets } = await db.secrets.listSecrets();

// Check if secret exists
const { exists } = await db.secrets.secretExists('api_key');

// Rotate a secret (get old value, set new one)
const { success, oldValue } = await db.secrets.rotateSecret('api_key', newValue);

// Batch operations
await db.secrets.batchOperation([
  { type: 'create', name: 'secret1', secret: 'value1' },
  { type: 'update', name: 'secret2', secret: 'value2' },
  { type: 'delete', name: 'secret3' },
]);
```

### Client Credentials Pattern

```typescript
// Store client credentials
await db.secrets.createSecret('priority_client', {
  username: 'client_user',
  password: 'client_pass',
  appId: 'app123',
  appKey: 'key456',
});

// Get client credentials (type-safe)
const { data: credentials } = await db.secrets.getClientCredentials('priority_client');
// Returns: { username, password, appId?, appKey? }
```

## Filter Operators

The following operators are supported for filtering:

- `eq` - Equal
- `neq` - Not equal
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `like` - SQL LIKE (case-sensitive)
- `ilike` - SQL ILIKE (case-insensitive)
- `in` - In array
- `is` - Is (for null checks)

## Error Handling

All operations return a consistent error format:

```typescript
const { data, error } = await db.tables.getRecord('users', 'invalid-id');

if (error) {
  console.error('Operation failed:', error.message);
  // Handle error appropriately
}
```

## Health Check and Monitoring

```typescript
// Check database health
const health = await db.healthCheck();
console.log(health.status); // 'ok' | 'error'

// Get database info
const info = await db.getDatabaseInfo();
console.log(info.tables); // List of available tables
console.log(info.version); // Database version
```

## Utilities

The service includes various utility functions:

```typescript
import { validateTableName, validateColumnName, generatePaginationMeta, buildQueryFromParams, retryWithBackoff } from '@/lib/db/utils';

// Validate table/column names
const isValid = validateTableName('users'); // true
const isValidColumn = validateColumnName('user_id'); // true

// Generate pagination metadata
const meta = generatePaginationMeta(100, 2, 10);
// Returns: { total: 100, page: 2, totalPages: 10, hasNextPage: true, ... }

// Build query from URL params
const searchParams = new URLSearchParams('?filter.status.eq=active&orderBy=name');
const query = buildQueryFromParams(searchParams);

// Retry with exponential backoff
await retryWithBackoff(
  async () => {
    return db.tables.getRecord('users', 'user-id');
  },
  3,
  1000
);
```

## Required Supabase RPC Functions

Some advanced features require custom RPC functions in your Supabase project:

### For Secrets Management

```sql
-- Read secret from vault
CREATE OR REPLACE FUNCTION read_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN vault.read_secret(secret_name);
END;
$$;

-- Insert secret to vault
CREATE OR REPLACE FUNCTION insert_secret(name text, secret text, description text DEFAULT NULL, key_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM vault.create_secret(secret, name, description, key_id);
END;
$$;

-- Update secret in vault
CREATE OR REPLACE FUNCTION update_secret(name text, secret text, description text DEFAULT NULL, key_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM vault.update_secret(vault.get_secret_id(name), secret, name, description, key_id);
END;
$$;

-- Delete secret from vault
CREATE OR REPLACE FUNCTION delete_secret(secret_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM vault.delete_secret(vault.get_secret_id(secret_name));
END;
$$;
```

### For Advanced Table Operations

```sql
-- Get table schema
CREATE OR REPLACE FUNCTION get_table_schema(table_name text)
RETURNS TABLE(name text, type text, nullable boolean, default_value text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    column_name::text,
    data_type::text,
    is_nullable::boolean,
    column_default::text
  FROM information_schema.columns
  WHERE table_name = get_table_schema.table_name
  AND table_schema = 'public';
END;
$$;

-- Execute raw SQL
CREATE OR REPLACE FUNCTION execute_sql(query text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- This is a simplified example - implement based on your security requirements
  EXECUTE query INTO result USING params;
  RETURN result;
END;
$$;
```

## Security Considerations

1. **Row Level Security (RLS)**: Ensure RLS is enabled on all tables
2. **Service Role Usage**: The service uses the service role key for administrative operations
3. **Input Validation**: All inputs are validated to prevent SQL injection
4. **Secrets Encryption**: Secrets are encrypted in Supabase Vault
5. **Function Security**: Custom RPC functions should use `SECURITY DEFINER` carefully

## Examples

See `examples.ts` for comprehensive usage examples including:

- CRUD operations with complex filtering
- Secrets management workflows
- Bulk operations and transactions
- Error handling patterns
- Health monitoring

## Types

The service is fully typed with TypeScript. Main types include:

- `TableRecord` - Generic table record type
- `TableFilter` - Filter definition for queries
- `TableQuery` - Complete query specification
- `SecretValue` - Secret value type (object or string)
- `SecretMetadata` - Secret metadata information
- `DatabaseResponse<T>` - Standard response format

## Contributing

When adding new features:

1. Add proper TypeScript types
2. Include comprehensive error handling
3. Add examples to the examples file
4. Update this documentation
5. Write tests for new functionality
