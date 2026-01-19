/**
 * Store Service - Main service for store connections
 */

import crypto from 'node:crypto';
import type { DatabaseFacade, StoreConnectionInfo, StoreType } from 'visualizer-db';
import { providers, type AuthParams, type AuthState, type ProviderCredentials, type ProviderType } from '../providers';
import { encryptCredentials, decryptCredentials } from './credentials-crypto';
import type { StoreCredentialsPayload } from '../types/credentials';

const AUTH_STATE_EXPIRY_MS = 15 * 60 * 1000;

export class StoreService {
  private authStates = new Map<string, AuthState>();

  constructor(private db: DatabaseFacade) {}

  // Auth

  initAuth(provider: ProviderType, params: AuthParams) {
    const p = providers.require(provider);
    const stateId = crypto.randomUUID();
    const state = p.createAuthState(params, stateId, new Date(Date.now() + AUTH_STATE_EXPIRY_MS));
    this.authStates.set(stateId, state);
    return { authUrl: p.buildAuthUrl(params, stateId), stateId };
  }

  async handleCallback(stateId: string, payload: unknown): Promise<{ success: boolean; error?: string; returnUrl?: string }> {
    const state = this.validateState(stateId);
    if (!state) {
      return { success: false, error: 'Invalid or expired auth state' };
    }

    try {
      const credentials = await providers.require(state.provider).parseCallback(payload, state);
      await this.saveCredentials(state.clientId, state.provider, credentials);
      this.authStates.delete(stateId);
      return { success: true, returnUrl: state.returnUrl };
    } catch (error) {
      console.error(`${state.provider} callback error:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  getAuthState(stateId: string): AuthState | null {
    return this.validateState(stateId);
  }

  // Credentials

  private async saveCredentials(clientId: string, provider: ProviderType, credentials: ProviderCredentials) {
    const payload: StoreCredentialsPayload = { provider, credentials };
    await this.db.storeConnections.upsert({
      clientId,
      storeType: provider as StoreType,
      storeUrl: credentials.baseUrl,
      storeName: null,
      credentials: encryptCredentials(payload),
    });
  }

  async getCredentials(clientId: string): Promise<{ provider: ProviderType; credentials: ProviderCredentials } | null> {
    const row = await this.db.storeConnections.getByClientId(clientId);
    if (!row) {
      return null;
    }
    const payload = decryptCredentials(this.db.storeConnections.getEncryptedCredentials(row));
    return { provider: payload.provider, credentials: payload.credentials };
  }

  // API Operations

  async getProducts(clientId: string, options?: { limit?: number; page?: number; search?: string }) {
    const creds = await this.requireCredentials(clientId);
    return providers.require(creds.provider).getProducts(creds.credentials, options);
  }

  async getProduct(clientId: string, productId: string | number) {
    const creds = await this.requireCredentials(clientId);
    return providers.require(creds.provider).getProduct(creds.credentials, productId);
  }

  async getCategories(clientId: string) {
    const creds = await this.requireCredentials(clientId);
    return providers.require(creds.provider).getCategories(creds.credentials);
  }

  async testConnection(clientId: string): Promise<boolean> {
    const creds = await this.getCredentials(clientId);
    return creds ? providers.require(creds.provider).testConnection(creds.credentials) : false;
  }

  // Connection Management

  getConnection(clientId: string): Promise<StoreConnectionInfo | null> {
    return this.db.storeConnections.getInfoByClientId(clientId);
  }

  disconnect(clientId: string) {
    return this.db.storeConnections.updateStatusByClientId(clientId, 'disconnected');
  }

  deleteConnection(clientId: string) {
    return this.db.storeConnections.deleteByClientId(clientId);
  }

  updateLastSync(clientId: string) {
    return this.db.storeConnections.updateLastSync(clientId);
  }

  getSupportedProviders() {
    return providers.getProviderInfo();
  }

  // Internal

  private validateState(stateId: string): AuthState | null {
    const state = this.authStates.get(stateId);
    if (!state || new Date() > state.expiresAt) {
      if (state) {
        this.authStates.delete(stateId);
      }
      return null;
    }
    return state;
  }

  private async requireCredentials(clientId: string) {
    const creds = await this.getCredentials(clientId);
    if (!creds) {
      throw new Error('No store connected');
    }
    return creds;
  }

  cleanupExpiredStates() {
    const now = new Date();
    for (const [id, state] of this.authStates) {
      if (now > state.expiresAt) {
        this.authStates.delete(id);
      }
    }
  }
}
