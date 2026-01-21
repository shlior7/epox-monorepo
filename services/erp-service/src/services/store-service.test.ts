import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreService } from './store-service';
import type { DatabaseFacade, StoreConnectionRow, StoreConnectionInfo } from 'visualizer-db';
import type { ProviderType } from '../providers';

// Mock database facade
const createMockDb = (): DatabaseFacade =>
  ({
    storeConnections: {
      upsert: vi.fn(),
      getByClientId: vi.fn(),
      getInfoByClientId: vi.fn(),
      updateStatusByClientId: vi.fn(),
      updateLastSync: vi.fn(),
      deleteByClientId: vi.fn(),
      getEncryptedCredentials: vi.fn((row) => ({
        ciphertext: row.credentialsCiphertext,
        iv: row.credentialsIv,
        tag: row.credentialsTag,
        keyId: row.credentialsKeyId,
        fingerprint: row.credentialsFingerprint,
      })),
    },
  }) as unknown as DatabaseFacade;

describe('StoreService', () => {
  let service: StoreService;
  let mockDb: DatabaseFacade;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new StoreService(mockDb);
  });

  describe('initAuth()', () => {
    it('should initialize WooCommerce auth and return URL', () => {
      const result = service.initAuth('woocommerce', {
        clientId: 'client-123',
        storeUrl: 'https://store.com',
        appName: 'Test App',
        callbackUrl: 'https://app.com/callback',
      });

      expect(result.stateId).toBeTruthy();
      expect(result.authUrl).toContain('https://store.com/wc-auth/v1/authorize');
      expect(result.authUrl).toContain('app_name=Test+App');
    });

    it('should initialize Shopify auth and return URL', () => {
      vi.stubEnv('SHOPIFY_API_KEY', 'test-key');

      const result = service.initAuth('shopify', {
        clientId: 'client-123',
        storeUrl: 'mystore.myshopify.com',
        appName: 'Test App',
        callbackUrl: 'https://app.com/callback',
      });

      expect(result.stateId).toBeTruthy();
      expect(result.authUrl).toContain('mystore.myshopify.com/admin/oauth/authorize');
    });

    it('should throw for unknown provider', () => {
      expect(() =>
        service.initAuth('unknown' as ProviderType, {
          clientId: 'client-123',
          storeUrl: 'https://store.com',
          appName: 'Test',
          callbackUrl: 'https://app.com/callback',
        })
      ).toThrow('Provider not found');
    });

    it('should store auth state that can be retrieved', () => {
      const result = service.initAuth('woocommerce', {
        clientId: 'client-123',
        storeUrl: 'https://store.com',
        appName: 'Test',
        callbackUrl: 'https://app.com/callback',
        returnUrl: 'https://app.com/return',
      });

      const state = service.getAuthState(result.stateId);
      expect(state).not.toBeNull();
      expect(state?.clientId).toBe('client-123');
      expect(state?.provider).toBe('woocommerce');
      expect(state?.returnUrl).toBe('https://app.com/return');
    });
  });

  describe('getAuthState()', () => {
    it('should return null for non-existent state', () => {
      expect(service.getAuthState('non-existent')).toBeNull();
    });

    it('should return null for expired state', async () => {
      // Create state with very short expiry
      const result = service.initAuth('woocommerce', {
        clientId: 'client-123',
        storeUrl: 'https://store.com',
        appName: 'Test',
        callbackUrl: 'https://app.com/callback',
      });

      // Manually expire the state by accessing internal map
      const state = (service as any).authStates.get(result.stateId);
      state.expiresAt = new Date(Date.now() - 1000);

      expect(service.getAuthState(result.stateId)).toBeNull();
    });
  });

  describe('handleCallback()', () => {
    it('should return error for invalid state', async () => {
      const result = await service.handleCallback('invalid-state', {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired auth state');
    });

    it('should return error for expired state', async () => {
      const initResult = service.initAuth('woocommerce', {
        clientId: 'client-123',
        storeUrl: 'https://store.com',
        appName: 'Test',
        callbackUrl: 'https://app.com/callback',
      });

      // Expire the state
      const state = (service as any).authStates.get(initResult.stateId);
      state.expiresAt = new Date(Date.now() - 1000);

      const result = await service.handleCallback(initResult.stateId, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired auth state');
    });

    it('should return error for invalid callback payload', async () => {
      const initResult = service.initAuth('woocommerce', {
        clientId: 'client-123',
        storeUrl: 'https://store.com',
        appName: 'Test',
        callbackUrl: 'https://app.com/callback',
      });

      const result = await service.handleCallback(initResult.stateId, {
        // Missing consumer_key and consumer_secret
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing consumer_key');
    });

    it('should save credentials on successful callback', async () => {
      const initResult = service.initAuth('woocommerce', {
        clientId: 'client-123',
        storeUrl: 'https://store.com',
        appName: 'Test',
        callbackUrl: 'https://app.com/callback',
        returnUrl: 'https://app.com/return',
      });

      const result = await service.handleCallback(initResult.stateId, {
        key_id: 1,
        user_id: 42,
        consumer_key: 'ck_test',
        consumer_secret: 'cs_test',
        key_permissions: 'read_write',
      });

      expect(result.success).toBe(true);
      expect(result.returnUrl).toBe('https://app.com/return');
      expect(mockDb.storeConnections.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-123',
          storeType: 'woocommerce',
          storeUrl: 'https://store.com',
        })
      );
    });

    it('should clear state after successful callback', async () => {
      const initResult = service.initAuth('woocommerce', {
        clientId: 'client-123',
        storeUrl: 'https://store.com',
        appName: 'Test',
        callbackUrl: 'https://app.com/callback',
      });

      await service.handleCallback(initResult.stateId, {
        key_id: 1,
        user_id: 42,
        consumer_key: 'ck_test',
        consumer_secret: 'cs_test',
        key_permissions: 'read_write',
      });

      expect(service.getAuthState(initResult.stateId)).toBeNull();
    });
  });

  describe('getConnection()', () => {
    it('should return connection info', async () => {
      const mockInfo: StoreConnectionInfo = {
        id: 'conn-1',
        clientId: 'client-123',
        storeType: 'woocommerce',
        storeUrl: 'https://store.com',
        storeName: 'Test Store',
        status: 'active',
        lastSyncAt: null,
        autoSyncEnabled: false,
        syncOnApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockDb.storeConnections.getInfoByClientId).mockResolvedValue(mockInfo);

      const result = await service.getConnection('client-123');
      expect(result).toEqual(mockInfo);
    });

    it('should return null for non-existent connection', async () => {
      vi.mocked(mockDb.storeConnections.getInfoByClientId).mockResolvedValue(null);
      const result = await service.getConnection('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('disconnect()', () => {
    it('should update connection status', async () => {
      await service.disconnect('client-123');
      expect(mockDb.storeConnections.updateStatusByClientId).toHaveBeenCalledWith('client-123', 'disconnected');
    });
  });

  describe('deleteConnection()', () => {
    it('should delete connection', async () => {
      await service.deleteConnection('client-123');
      expect(mockDb.storeConnections.deleteByClientId).toHaveBeenCalledWith('client-123');
    });
  });

  describe('updateLastSync()', () => {
    it('should update last sync timestamp', async () => {
      await service.updateLastSync('client-123');
      expect(mockDb.storeConnections.updateLastSync).toHaveBeenCalledWith('client-123');
    });
  });

  describe('getSupportedProviders()', () => {
    it('should return list of providers', () => {
      const providers = service.getSupportedProviders();
      expect(providers.length).toBeGreaterThanOrEqual(2);
      expect(providers.some((p) => p.type === 'woocommerce')).toBe(true);
      expect(providers.some((p) => p.type === 'shopify')).toBe(true);
    });
  });

  describe('testConnection()', () => {
    it('should return false when no credentials exist', async () => {
      vi.mocked(mockDb.storeConnections.getByClientId).mockResolvedValue(null);
      const result = await service.testConnection('client-123');
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredStates()', () => {
    it('should remove expired states', () => {
      // Create some states
      service.initAuth('woocommerce', {
        clientId: 'client-1',
        storeUrl: 'https://store1.com',
        appName: 'Test',
        callbackUrl: 'https://app.com/callback',
      });
      const result2 = service.initAuth('woocommerce', {
        clientId: 'client-2',
        storeUrl: 'https://store2.com',
        appName: 'Test',
        callbackUrl: 'https://app.com/callback',
      });

      // Expire the first state
      const states = (service as any).authStates;
      const firstKey = states.keys().next().value;
      states.get(firstKey).expiresAt = new Date(Date.now() - 1000);

      // Cleanup
      service.cleanupExpiredStates();

      // First should be gone, second should remain
      expect(states.size).toBe(1);
      expect(service.getAuthState(result2.stateId)).not.toBeNull();
    });
  });
});
