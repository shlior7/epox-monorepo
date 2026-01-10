/**
 * Supabase Setup Script
 *
 * This file contains the SQL functions that need to be created in your Supabase project
 * for the database service to work properly.
 *
 * Run these in your Supabase SQL Editor or through the CLI.
 */

export const REQUIRED_RPC_FUNCTIONS = {
  // =============================================================================
  // SECRETS MANAGEMENT FUNCTIONS
  // =============================================================================

  read_secret: `
    -- Function to read a secret from Supabase Vault
    CREATE OR REPLACE FUNCTION read_secret(secret_name text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN vault.read_secret(secret_name);
    EXCEPTION
      WHEN OTHERS THEN
        RETURN NULL;
    END;
    $$;
  `,

  insert_secret: `
    -- Function to insert a secret into Supabase Vault
    CREATE OR REPLACE FUNCTION insert_secret(
      name text, 
      secret text, 
      description text DEFAULT NULL, 
      key_id uuid DEFAULT NULL
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      PERFORM vault.create_secret(secret, name, description, key_id);
    END;
    $$;
  `,

  update_secret: `
    -- Function to update a secret in Supabase Vault
    CREATE OR REPLACE FUNCTION update_secret(
      name text, 
      secret text, 
      description text DEFAULT NULL, 
      key_id uuid DEFAULT NULL
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      secret_id uuid;
    BEGIN
      SELECT vault.get_secret_id(name) INTO secret_id;
      IF secret_id IS NOT NULL THEN
        PERFORM vault.update_secret(secret_id, secret, name, description, key_id);
      ELSE
        RAISE EXCEPTION 'Secret % not found', name;
      END IF;
    END;
    $$;
  `,

  delete_secret: `
    -- Function to delete a secret from Supabase Vault
    CREATE OR REPLACE FUNCTION delete_secret(secret_name text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      secret_id uuid;
    BEGIN
      SELECT vault.get_secret_id(secret_name) INTO secret_id;
      IF secret_id IS NOT NULL THEN
        PERFORM vault.delete_secret(secret_id);
      ELSE
        RAISE EXCEPTION 'Secret % not found', secret_name;
      END IF;
    END;
    $$;
  `,

  list_secrets: `
    -- Function to list all secrets (metadata only)
    CREATE OR REPLACE FUNCTION list_secrets()
    RETURNS TABLE(
      name text,
      description text,
      created_at timestamptz,
      updated_at timestamptz,
      key_id uuid
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        s.name::text,
        s.description::text,
        s.created_at,
        s.updated_at,
        s.key_id
      FROM vault.secrets s
      ORDER BY s.name;
    END;
    $$;
  `,

  secret_exists: `
    -- Function to check if a secret exists
    CREATE OR REPLACE FUNCTION secret_exists(secret_name text)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      secret_id uuid;
    BEGIN
      SELECT vault.get_secret_id(secret_name) INTO secret_id;
      RETURN secret_id IS NOT NULL;
    END;
    $$;
  `,

  get_secret_metadata: `
    -- Function to get metadata for a specific secret
    CREATE OR REPLACE FUNCTION get_secret_metadata(secret_name text)
    RETURNS TABLE(
      name text,
      description text,
      created_at timestamptz,
      updated_at timestamptz,
      key_id uuid
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        s.name::text,
        s.description::text,
        s.created_at,
        s.updated_at,
        s.key_id
      FROM vault.secrets s
      WHERE s.name = secret_name;
    END;
    $$;
  `,

  // =============================================================================
  // TABLE MANAGEMENT FUNCTIONS
  // =============================================================================

  get_table_list: `
    -- Function to get list of all tables
    CREATE OR REPLACE FUNCTION get_table_list()
    RETURNS text[]
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      table_names text[];
    BEGIN
      SELECT array_agg(table_name::text)
      INTO table_names
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
      
      RETURN COALESCE(table_names, ARRAY[]::text[]);
    END;
    $$;
  `,

  get_table_schema: `
    -- Function to get schema information for a table
    CREATE OR REPLACE FUNCTION get_table_schema(table_name text)
    RETURNS TABLE(
      name text,
      type text,
      nullable boolean,
      default_value text
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        column_name::text as name,
        data_type::text as type,
        CASE WHEN is_nullable = 'YES' THEN true ELSE false END as nullable,
        column_default::text as default_value
      FROM information_schema.columns
      WHERE table_name = get_table_schema.table_name
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    END;
    $$;
  `,

  execute_sql: `
    -- Function to execute raw SQL (USE WITH CAUTION)
    -- This is a simplified example - implement proper security checks
    CREATE OR REPLACE FUNCTION execute_sql(query text, params jsonb DEFAULT '[]'::jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result jsonb;
    BEGIN
      -- Add proper validation and security checks here
      -- This is just a placeholder implementation
      RAISE EXCEPTION 'Raw SQL execution not implemented for security reasons';
      RETURN '{}'::jsonb;
    END;
    $$;
  `,

  bulk_operation: `
    -- Function for bulk operations (simplified example)
    CREATE OR REPLACE FUNCTION bulk_operation(operations jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result jsonb := '[]'::jsonb;
    BEGIN
      -- This would need custom implementation based on your specific needs
      -- and security requirements
      RAISE EXCEPTION 'Bulk operations not implemented';
      RETURN result;
    END;
    $$;
  `,

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  version: `
    -- Function to get database version
    CREATE OR REPLACE FUNCTION version()
    RETURNS text
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT version();
    $$;
  `,
};

/**
 * Setup script to create all required functions
 */
export const SETUP_SCRIPT = Object.values(REQUIRED_RPC_FUNCTIONS).join('\n\n');

/**
 * Grant permissions script
 */
export const GRANT_PERMISSIONS = `
  -- Grant execute permissions to authenticated users for safe functions
  GRANT EXECUTE ON FUNCTION read_secret(text) TO authenticated;
  GRANT EXECUTE ON FUNCTION insert_secret(text, text, text, uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION update_secret(text, text, text, uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION delete_secret(text) TO authenticated;
  GRANT EXECUTE ON FUNCTION list_secrets() TO authenticated;
  GRANT EXECUTE ON FUNCTION secret_exists(text) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_secret_metadata(text) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_table_list() TO authenticated;
  GRANT EXECUTE ON FUNCTION get_table_schema(text) TO authenticated;
  GRANT EXECUTE ON FUNCTION version() TO authenticated;
  
  -- Note: execute_sql and bulk_operation should have restricted access
  -- Grant these only to specific roles that need them
`;

/**
 * Row Level Security policies for common tables
 */
export const RLS_POLICIES = `
  -- Example RLS policies (adjust based on your needs)
  
  -- Enable RLS on common tables
  ALTER TABLE IF EXISTS "Clients" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS "Users" ENABLE ROW LEVEL SECURITY;
  
  -- Example policy for Clients table
  DROP POLICY IF EXISTS "Users can view their own client data" ON "Clients";
  CREATE POLICY "Users can view their own client data" ON "Clients"
    FOR SELECT USING (auth.uid()::text = user_id OR auth.jwt() ->> 'role' = 'admin');
  
  DROP POLICY IF EXISTS "Admins can modify client data" ON "Clients";
  CREATE POLICY "Admins can modify client data" ON "Clients"
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
`;

/**
 * Full setup instructions
 */
export const SETUP_INSTRUCTIONS = `
# Supabase Database Service Setup

## Prerequisites
1. Supabase project with Vault enabled
2. Service role key configured in environment variables
3. SQL Editor access or Supabase CLI

## Setup Steps

### 1. Create Required Functions
Run the following SQL in your Supabase SQL Editor:

\`\`\`sql
${SETUP_SCRIPT}
\`\`\`

### 2. Grant Permissions
\`\`\`sql
${GRANT_PERMISSIONS}
\`\`\`

### 3. Setup Row Level Security (Optional)
\`\`\`sql
${RLS_POLICIES}
\`\`\`

### 4. Environment Variables
Ensure these are set in your .env.local:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

### 5. Test the Setup
\`\`\`typescript
import { db } from '@/lib/db';

// Test database connection
const health = await db.healthCheck();
console.log('Database health:', health);

// Test secrets (if vault is enabled)
await db.secrets.createSecret('test', { value: 'hello' });
const secret = await db.secrets.getSecret('test');
console.log('Secret test:', secret);
\`\`\`

## Security Notes
- The execute_sql and bulk_operation functions are disabled by default for security
- Implement proper RLS policies for your tables
- Use service role key only on the server side
- Validate all inputs in your application code
`;

/**
 * Helper function to check if functions exist
 */
export const CHECK_FUNCTIONS_SCRIPT = `
  SELECT 
    routine_name,
    routine_type,
    security_type
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN (
    'read_secret',
    'insert_secret', 
    'update_secret',
    'delete_secret',
    'list_secrets',
    'secret_exists',
    'get_secret_metadata',
    'get_table_list',
    'get_table_schema',
    'version'
  )
  ORDER BY routine_name;
`;
