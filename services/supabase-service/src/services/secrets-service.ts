import type { SupabaseClient } from '@supabase/supabase-js';

export type SecretValue = Record<string, any>;

export interface SecretMetadata {
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  key_id?: string;
}

export interface CreateSecretOptions {
  description?: string;
  key_id?: string;
}

/**
 * Secrets Service
 * Handles Supabase Vault operations for secure secret management
 */
export class SecretsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Store a secret in Supabase Vault
   */
  async createSecret(
    name: string,
    secret: SecretValue | string,
    options: CreateSecretOptions = {}
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const secretValue = typeof secret === 'string' ? secret : JSON.stringify(secret);

      const { error } = await this.supabase.rpc('insert_secret', {
        name,
        secret: secretValue,
        description: options.description ?? null,
        key_id: options.key_id ?? null,
      });

      if (error) {
        return {
          success: false,
          error: new Error(`Failed to create secret: ${error.message}`),
        };
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Read a secret from Supabase Vault
   */
  async getSecret(name: string, parseJson = true): Promise<{ data: SecretValue | string | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.rpc('read_secret', {
        secret_name: name,
      });

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to read secret: ${error.message}`),
        };
      }

      if (!data) {
        return {
          data: null,
          error: new Error(`Secret '${name}' not found`),
        };
      }

      // Try to parse as JSON if requested
      if (parseJson && typeof data === 'string') {
        try {
          return {
            data: JSON.parse(data),
            error: null,
          };
        } catch {
          // If parsing fails, return as string
          return {
            data,
            error: null,
          };
        }
      }

      return {
        data,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Update an existing secret
   */
  async updateSecret(
    name: string,
    secret: SecretValue | string,
    options: CreateSecretOptions = {}
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const secretValue = typeof secret === 'string' ? secret : JSON.stringify(secret);

      const { error } = await this.supabase.rpc('update_secret', {
        name,
        secret: secretValue,
        description: options.description ?? null,
        key_id: options.key_id ?? null,
      });

      if (error) {
        return {
          success: false,
          error: new Error(`Failed to update secret: ${error.message}`),
        };
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Delete a secret from Supabase Vault
   */
  async deleteSecret(name: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await this.supabase.rpc('delete_secret', {
        secret_name: name,
      });

      if (error) {
        return {
          success: false,
          error: new Error(`Failed to delete secret: ${error.message}`),
        };
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * List all available secrets (metadata only, not values)
   */
  async listSecrets(): Promise<{ data: SecretMetadata[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.rpc('list_secrets');

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to list secrets: ${error.message}`),
        };
      }

      return {
        data: data ?? [],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Check if a secret exists
   */
  async secretExists(name: string): Promise<{ exists: boolean; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.rpc('secret_exists', {
        secret_name: name,
      });

      if (error) {
        return {
          exists: false,
          error: new Error(`Failed to check secret existence: ${error.message}`),
        };
      }

      return {
        exists: !!data,
        error: null,
      };
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Get metadata for a specific secret
   */
  async getSecretMetadata(name: string): Promise<{ data: SecretMetadata | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.rpc('get_secret_metadata', {
        secret_name: name,
      });

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to get secret metadata: ${error.message}`),
        };
      }

      return {
        data: data ?? null,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Rotate/regenerate a secret with a new value
   */
  async rotateSecret(
    name: string,
    newSecret: SecretValue | string,
    options: CreateSecretOptions = {}
  ): Promise<{ success: boolean; oldValue?: SecretValue | string; error: Error | null }> {
    try {
      // First, get the old value
      const { data: oldValue } = await this.getSecret(name);

      // Update with new value
      const updateResult = await this.updateSecret(name, newSecret, options);

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error,
        };
      }

      return {
        success: true,
        oldValue: oldValue ?? undefined,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Backup secrets to a secure location (returns encrypted data)
   */
  async backupSecrets(secretNames?: string[]): Promise<{
    data: Array<{ name: string; encrypted_value: string }> | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('backup_secrets', {
        secret_names: secretNames ?? null,
      });

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to backup secrets: ${error.message}`),
        };
      }

      return {
        data: data ?? [],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Batch operations for multiple secrets
   */
  async batchOperation(
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      name: string;
      secret?: SecretValue | string;
      options?: CreateSecretOptions;
    }>
  ): Promise<{
    success: boolean;
    results: Array<{ name: string; success: boolean; error?: string }>;
    error: Error | null;
  }> {
    try {
      const results: Array<{ name: string; success: boolean; error?: string }> = [];
      let hasErrors = false;

      for (const operation of operations) {
        let result: { success: boolean; error: Error | null };

        switch (operation.type) {
          case 'create':
            if (!operation.secret) {
              result = {
                success: false,
                error: new Error('Secret value is required for create operation'),
              };
            } else {
              result = await this.createSecret(operation.name, operation.secret, operation.options);
            }
            break;
          case 'update':
            if (!operation.secret) {
              result = {
                success: false,
                error: new Error('Secret value is required for update operation'),
              };
            } else {
              result = await this.updateSecret(operation.name, operation.secret, operation.options);
            }
            break;
          case 'delete':
            result = await this.deleteSecret(operation.name);
            break;
          default:
            result = {
              success: false,
              error: new Error(`Unknown operation type: ${(operation as any).type}`),
            };
        }

        results.push({
          name: operation.name,
          success: result.success,
          error: result.error?.message,
        });

        if (!result.success) {
          hasErrors = true;
        }
      }

      return {
        success: !hasErrors,
        results,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Utility method for client credentials (commonly used pattern)
   * Expects secret to contain: { username, password, appId?, appKey? }
   */
  async getClientCredentials(secretName: string): Promise<{
    data: {
      username: string;
      password: string;
      appId?: string;
      appKey?: string;
    } | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await this.getSecret(secretName, true);

      if (error) {
        return { data: null, error };
      }

      if (!data || typeof data !== 'object') {
        return {
          data: null,
          error: new Error(`Invalid secret format for ${secretName}`),
        };
      }

      const credentials = data as Record<string, any>;

      if (!credentials.username || !credentials.password) {
        return {
          data: null,
          error: new Error(`Secret ${secretName} must contain username and password`),
        };
      }

      return {
        data: {
          username: credentials.username,
          password: credentials.password,
          appId: credentials.appId,
          appKey: credentials.appKey,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }
}
