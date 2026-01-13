/**
 * ERP Credentials Service
 * Handles secure storage and retrieval of provider credentials from Neon
 */

import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { DrizzleClient } from 'visualizer-db';
import type { ERPProviderType, ProviderCredentials, WooCommerceCredentials } from '../types/provider';
import type { EncryptedCredentials, StoreCredentialsPayload } from '../types/credentials';
import { decryptCredentials, encryptCredentials } from './credentials-crypto';

/**
 * Secret structure stored in Neon
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
  constructor(private drizzle: DrizzleClient) {}

  /**
   * Store provider credentials for a client
   */
  async saveCredentials(
    clientId: string,
    provider: ERPProviderType,
    credentials: ProviderCredentials
  ): Promise<CredentialsResult<void>> {
    try {
      const payload: StoreCredentialsPayload = {
        provider,
        credentials,
      };
      const encrypted = encryptCredentials(payload);
      const now = new Date();
      const storeUrl = credentials.baseUrl;
      const storeName = provider === 'shopify' && 'shopName' in credentials ? credentials.shopName : null;

      await this.drizzle.execute(sql`
        INSERT INTO store_connection (
          id,
          client_id,
          store_type,
          store_url,
          store_name,
          credentials_ciphertext,
          credentials_iv,
          credentials_tag,
          credentials_key_id,
          credentials_fingerprint,
          token_expires_at,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${crypto.randomUUID()},
          ${clientId},
          ${provider},
          ${storeUrl},
          ${storeName},
          ${encrypted.ciphertext},
          ${encrypted.iv},
          ${encrypted.tag},
          ${encrypted.keyId},
          ${encrypted.fingerprint},
          ${null},
          'active',
          ${now},
          ${now}
        )
        ON CONFLICT (client_id, store_type, store_url)
        DO UPDATE SET
          store_name = EXCLUDED.store_name,
          credentials_ciphertext = EXCLUDED.credentials_ciphertext,
          credentials_iv = EXCLUDED.credentials_iv,
          credentials_tag = EXCLUDED.credentials_tag,
          credentials_key_id = EXCLUDED.credentials_key_id,
          credentials_fingerprint = EXCLUDED.credentials_fingerprint,
          token_expires_at = EXCLUDED.token_expires_at,
          status = 'active',
          updated_at = EXCLUDED.updated_at
      `);

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
      const result = await this.drizzle.execute(sql`
        SELECT
          id,
          store_type,
          credentials_ciphertext,
          credentials_iv,
          credentials_tag,
          credentials_key_id,
          credentials_fingerprint
        FROM store_connection
        WHERE client_id = ${clientId}
        ORDER BY updated_at DESC
        LIMIT 1
      `);

      const row = result.rows[0] as
        | {
            id: string;
            store_type: ERPProviderType;
            credentials_ciphertext: string;
            credentials_iv: string;
            credentials_tag: string;
            credentials_key_id: string;
            credentials_fingerprint: string | null;
          }
        | undefined;

      if (!row) {
        return { data: null, error: new Error(`No credentials found for client: ${clientId}`) };
      }

      const encrypted: EncryptedCredentials = {
        ciphertext: row.credentials_ciphertext,
        iv: row.credentials_iv,
        tag: row.credentials_tag,
        keyId: row.credentials_key_id,
        fingerprint: row.credentials_fingerprint ?? '',
      };

      const payload = decryptCredentials(encrypted);
      const provider = payload.provider ?? row.store_type;

      return {
        data: {
          id: clientId,
          provider,
          credentials: payload.credentials,
        },
        error: null,
      };
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
      await this.drizzle.execute(sql`
        DELETE FROM store_connection
        WHERE client_id = ${clientId}
      `);

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
      const result = await this.drizzle.execute(sql`
        SELECT 1
        FROM store_connection
        WHERE client_id = ${clientId}
        LIMIT 1
      `);

      return { data: result.rows.length > 0, error: null };
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
    try {
      const result = await this.drizzle.execute(sql`
        SELECT store_type
        FROM store_connection
        WHERE client_id = ${clientId}
        ORDER BY updated_at DESC
        LIMIT 1
      `);

      const row = result.rows[0] as { store_type: ERPProviderType } | undefined;
      return { data: row?.store_type ?? null, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get provider type'),
      };
    }
  }
}
