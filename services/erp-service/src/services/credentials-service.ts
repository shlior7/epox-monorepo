/**
 * ERP Credentials Service
 * Handles secure storage and retrieval of provider credentials from Supabase Vault
 */

import { SecretsService } from '@scenergy/supabase-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ERPProviderType, ProviderCredentials, WooCommerceCredentials } from '../types/provider';

/**
 * Secret structure stored in Supabase Vault
 * Secret name format: client-{clientId}
 */
export interface ClientProviderSecret {
  id: string; // Client ID
  provider: ERPProviderType;
  credentials: ProviderCredentials;
}

/**
 * Result of credential operations
 */
export interface CredentialsResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Credentials Service for ERP providers
 */
export class CredentialsService {
  private secretsService: SecretsService;

  constructor(supabaseClient: SupabaseClient) {
    this.secretsService = new SecretsService(supabaseClient);
  }

  /**
   * Generate the secret name for a client
   * Format: client-{clientId}
   */
  private getSecretName(clientId: string): string {
    return `client-${clientId}`;
  }

  /**
   * Store provider credentials for a client
   */
  async saveCredentials(
    clientId: string,
    provider: ERPProviderType,
    credentials: ProviderCredentials
  ): Promise<CredentialsResult<void>> {
    try {
      const secretName = this.getSecretName(clientId);
      const secretValue: ClientProviderSecret = {
        id: clientId,
        provider,
        credentials,
      };

      // Check if secret already exists
      const { exists } = await this.secretsService.secretExists(secretName);

      if (exists) {
        // Update existing secret
        const { error } = await this.secretsService.updateSecret(secretName, secretValue, {
          description: `ERP credentials for client: ${clientId} (${provider})`,
        });

        if (error) {
          return { data: null, error };
        }
      } else {
        // Create new secret
        const { error } = await this.secretsService.createSecret(secretName, secretValue, {
          description: `ERP credentials for client: ${clientId} (${provider})`,
        });

        if (error) {
          return { data: null, error };
        }
      }

      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to save credentials'),
      };
    }
  }

  /**
   * Get provider credentials for a client by client ID
   */
  async getCredentials(clientId: string): Promise<CredentialsResult<ClientProviderSecret>> {
    try {
      const secretName = this.getSecretName(clientId);
      const { data, error } = await this.secretsService.getSecret(secretName, true);

      if (error) {
        return { data: null, error };
      }

      if (!data || typeof data !== 'object') {
        return {
          data: null,
          error: new Error(`No credentials found for client: ${clientId}`),
        };
      }

      const secret = data as ClientProviderSecret;

      // Validate the secret structure
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!secret.id || !secret.provider || !secret.credentials) {
        return {
          data: null,
          error: new Error(`Invalid credential format for client: ${clientId}`),
        };
      }

      return { data: secret, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get credentials'),
      };
    }
  }

  /**
   * Get WooCommerce credentials specifically
   */
  async getWooCommerceCredentials(clientId: string): Promise<CredentialsResult<WooCommerceCredentials>> {
    const result = await this.getCredentials(clientId);

    if (result.error || !result.data) {
      return { data: null, error: result.error };
    }

    if (result.data.provider !== 'woocommerce') {
      return {
        data: null,
        error: new Error(`Client ${clientId} is not configured for WooCommerce (provider: ${result.data.provider})`),
      };
    }

    return {
      data: result.data.credentials as WooCommerceCredentials,
      error: null,
    };
  }

  /**
   * Delete provider credentials for a client
   */
  async deleteCredentials(clientId: string): Promise<CredentialsResult<void>> {
    try {
      const secretName = this.getSecretName(clientId);
      const { error } = await this.secretsService.deleteSecret(secretName);

      if (error) {
        return { data: null, error };
      }

      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to delete credentials'),
      };
    }
  }

  /**
   * Check if a client has provider credentials configured
   */
  async hasCredentials(clientId: string): Promise<CredentialsResult<boolean>> {
    try {
      const secretName = this.getSecretName(clientId);
      const { exists, error } = await this.secretsService.secretExists(secretName);

      if (error) {
        return { data: null, error };
      }

      return { data: exists, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to check credentials'),
      };
    }
  }

  /**
   * Get the provider type for a client (without exposing credentials)
   */
  async getProviderType(clientId: string): Promise<CredentialsResult<ERPProviderType | null>> {
    const result = await this.getCredentials(clientId);

    if (result.error) {
      // If secret not found, return null instead of error
      if (result.error.message.includes('not found')) {
        return { data: null, error: null };
      }
      return { data: null, error: result.error };
    }

    return { data: result.data?.provider ?? null, error: null };
  }
}
