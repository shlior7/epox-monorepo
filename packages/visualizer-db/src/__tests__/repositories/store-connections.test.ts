/**
 * Store Connection Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StoreConnectionRepository, type EncryptedCredentials, type StoreConnectionCreate } from '../../repositories/store-connections';
import { testDb } from '../setup';
import { createTestClient } from '../helpers';

describe('StoreConnectionRepository', () => {
  let repo: StoreConnectionRepository;
  let testClientId: string;

  const mockCredentials: EncryptedCredentials = {
    ciphertext: 'encrypted-data',
    iv: 'initialization-vector',
    tag: 'auth-tag',
    keyId: 'key-123',
    fingerprint: 'fp-abc',
  };

  beforeEach(async () => {
    repo = new StoreConnectionRepository(testDb as any);

    const client = await createTestClient(testDb as any);
    testClientId = client.id;
  });

  describe('upsert', () => {
    it('should create a new store connection', async () => {
      const data: StoreConnectionCreate = {
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://test-store.myshopify.com',
        storeName: 'Test Store',
        credentials: mockCredentials,
      };

      const connection = await repo.upsert(data);

      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.clientId).toBe(testClientId);
      expect(connection.storeType).toBe('shopify');
      expect(connection.storeUrl).toBe('https://test-store.myshopify.com');
      expect(connection.status).toBe('active');
    });

    it('should update existing connection on conflict', async () => {
      const data: StoreConnectionCreate = {
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://test-store.myshopify.com',
        credentials: mockCredentials,
      };

      await repo.upsert(data);

      const updatedCredentials = { ...mockCredentials, ciphertext: 'new-encrypted-data' };
      const updated = await repo.upsert({ ...data, credentials: updatedCredentials, storeName: 'Updated Store' });

      expect(updated.credentialsCiphertext).toBe('new-encrypted-data');
      expect(updated.storeName).toBe('Updated Store');
    });

    it('should set default values', async () => {
      const data: StoreConnectionCreate = {
        clientId: testClientId,
        storeType: 'woocommerce',
        storeUrl: 'https://woo-store.com',
        credentials: mockCredentials,
      };

      const connection = await repo.upsert(data);

      expect(connection.autoSyncEnabled).toBe(false);
      expect(connection.syncOnApproval).toBe(true);
    });

    it('should allow custom settings', async () => {
      const data: StoreConnectionCreate = {
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://custom.myshopify.com',
        credentials: mockCredentials,
        autoSyncEnabled: true,
        syncOnApproval: false,
        tokenExpiresAt: new Date(Date.now() + 86400000),
      };

      const connection = await repo.upsert(data);

      expect(connection.autoSyncEnabled).toBe(true);
      expect(connection.syncOnApproval).toBe(false);
      expect(connection.tokenExpiresAt).toBeInstanceOf(Date);
    });
  });

  describe('getByClientId', () => {
    it('should return most recent connection for client', async () => {
      await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://store1.myshopify.com',
        credentials: mockCredentials,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repo.upsert({
        clientId: testClientId,
        storeType: 'woocommerce',
        storeUrl: 'https://store2.com',
        credentials: mockCredentials,
      });

      const connection = await repo.getByClientId(testClientId);

      expect(connection).toBeDefined();
      expect(connection?.storeType).toBe('woocommerce'); // Most recent
    });

    it('should return null for client with no connections', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'No Connections' });
      const connection = await repo.getByClientId(newClient.id);

      expect(connection).toBeNull();
    });
  });

  describe('getByClientAndType', () => {
    it('should return connection by client and type', async () => {
      await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://shopify.store.com',
        credentials: mockCredentials,
      });

      await repo.upsert({
        clientId: testClientId,
        storeType: 'woocommerce',
        storeUrl: 'https://woo.store.com',
        credentials: mockCredentials,
      });

      const shopify = await repo.getByClientAndType(testClientId, 'shopify');
      const woo = await repo.getByClientAndType(testClientId, 'woocommerce');

      expect(shopify?.storeType).toBe('shopify');
      expect(woo?.storeType).toBe('woocommerce');
    });

    it('should return null for non-existent type', async () => {
      await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://test.myshopify.com',
        credentials: mockCredentials,
      });

      const bigcommerce = await repo.getByClientAndType(testClientId, 'bigcommerce');
      expect(bigcommerce).toBeNull();
    });
  });

  describe('listByClientId', () => {
    it('should return all connections for client', async () => {
      await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://shop1.myshopify.com',
        credentials: mockCredentials,
      });

      await repo.upsert({
        clientId: testClientId,
        storeType: 'woocommerce',
        storeUrl: 'https://shop2.com',
        credentials: mockCredentials,
      });

      const connections = await repo.listByClientId(testClientId);

      expect(connections.length).toBe(2);
    });

    it('should return empty array for client with no connections', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'Empty' });
      const connections = await repo.listByClientId(newClient.id);

      expect(connections).toEqual([]);
    });
  });

  describe('getInfoByClientId', () => {
    it('should return connection info without credentials', async () => {
      await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://info.myshopify.com',
        storeName: 'Info Store',
        credentials: mockCredentials,
      });

      const info = await repo.getInfoByClientId(testClientId);

      expect(info).toBeDefined();
      expect(info?.storeType).toBe('shopify');
      expect(info?.storeName).toBe('Info Store');
      // Should NOT have credential fields
      expect((info as any).credentialsCiphertext).toBeUndefined();
      expect((info as any).credentialsIv).toBeUndefined();
    });

    it('should return null for non-existent client', async () => {
      const info = await repo.getInfoByClientId('non-existent');
      expect(info).toBeNull();
    });
  });

  describe('update', () => {
    it('should update connection fields', async () => {
      const connection = await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://update.myshopify.com',
        credentials: mockCredentials,
      });

      const updated = await repo.update(connection.id, {
        storeName: 'Updated Name',
        autoSyncEnabled: true,
      });

      expect(updated.storeName).toBe('Updated Name');
      expect(updated.autoSyncEnabled).toBe(true);
    });

    it('should update credentials', async () => {
      const connection = await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://creds.myshopify.com',
        credentials: mockCredentials,
      });

      const newCredentials = { ...mockCredentials, ciphertext: 'new-cipher' };
      const updated = await repo.update(connection.id, { credentials: newCredentials });

      expect(updated.credentialsCiphertext).toBe('new-cipher');
    });

    it('should update status', async () => {
      const connection = await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://status.myshopify.com',
        credentials: mockCredentials,
      });

      const updated = await repo.update(connection.id, { status: 'error' });

      expect(updated.status).toBe('error');
    });

    it('should throw for non-existent connection', async () => {
      await expect(repo.update('non-existent', { storeName: 'Test' })).rejects.toThrow();
    });

    it('should update updatedAt timestamp', async () => {
      const connection = await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://timestamp.myshopify.com',
        credentials: mockCredentials,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await repo.update(connection.id, { storeName: 'New Name' });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(connection.updatedAt.getTime());
    });
  });

  describe('updateStatusByClientId', () => {
    it('should update status for all client connections', async () => {
      await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://s1.myshopify.com',
        credentials: mockCredentials,
      });

      await repo.upsert({
        clientId: testClientId,
        storeType: 'woocommerce',
        storeUrl: 'https://w1.com',
        credentials: mockCredentials,
      });

      await repo.updateStatusByClientId(testClientId, 'disconnected');

      const connections = await repo.listByClientId(testClientId);
      expect(connections.every((c) => c.status === 'disconnected')).toBe(true);
    });
  });

  describe('updateLastSync', () => {
    it('should update lastSyncAt timestamp', async () => {
      const connection = await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://sync.myshopify.com',
        credentials: mockCredentials,
      });

      expect(connection.lastSyncAt).toBeNull();

      await repo.updateLastSync(testClientId);

      const updated = await repo.getByClientId(testClientId);
      expect(updated?.lastSyncAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteByClientId', () => {
    it('should delete all connections for client', async () => {
      await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://del1.myshopify.com',
        credentials: mockCredentials,
      });

      await repo.upsert({
        clientId: testClientId,
        storeType: 'woocommerce',
        storeUrl: 'https://del2.com',
        credentials: mockCredentials,
      });

      await repo.deleteByClientId(testClientId);

      const connections = await repo.listByClientId(testClientId);
      expect(connections).toEqual([]);
    });

    it('should not throw for client with no connections', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'No Connections' });
      await expect(repo.deleteByClientId(newClient.id)).resolves.not.toThrow();
    });
  });

  describe('hasConnection', () => {
    it('should return true if client has connection', async () => {
      await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://has.myshopify.com',
        credentials: mockCredentials,
      });

      const hasConn = await repo.hasConnection(testClientId);
      expect(hasConn).toBe(true);
    });

    it('should return false if client has no connections', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'Empty' });
      const hasConn = await repo.hasConnection(newClient.id);
      expect(hasConn).toBe(false);
    });
  });

  describe('getEncryptedCredentials', () => {
    it('should extract credentials from row', async () => {
      const connection = await repo.upsert({
        clientId: testClientId,
        storeType: 'shopify',
        storeUrl: 'https://extract.myshopify.com',
        credentials: mockCredentials,
      });

      const extracted = repo.getEncryptedCredentials(connection);

      expect(extracted.ciphertext).toBe(mockCredentials.ciphertext);
      expect(extracted.iv).toBe(mockCredentials.iv);
      expect(extracted.tag).toBe(mockCredentials.tag);
      expect(extracted.keyId).toBe(mockCredentials.keyId);
      expect(extracted.fingerprint).toBe(mockCredentials.fingerprint);
    });
  });
});
