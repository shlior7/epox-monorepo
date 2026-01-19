import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encryptCredentials, decryptCredentials, getCredentialsKey, getCredentialsKeyId } from './credentials-crypto';
import type { StoreCredentialsPayload } from '../types/credentials';

describe('credentials-crypto', () => {
  const testKey = Buffer.alloc(32, 'test'); // 32 bytes for AES-256
  const testPayload: StoreCredentialsPayload = {
    provider: 'woocommerce',
    credentials: {
      baseUrl: 'https://store.com',
      consumerKey: 'ck_secret123',
      consumerSecret: 'cs_secret456',
    },
  };

  describe('getCredentialsKey()', () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should return key from environment variable', () => {
      const keyBase64 = testKey.toString('base64');
      vi.stubEnv('STORE_CREDENTIALS_KEY', keyBase64);

      const key = getCredentialsKey();
      expect(key).toEqual(testKey);
    });

    it('should throw if environment variable not set', () => {
      vi.stubEnv('STORE_CREDENTIALS_KEY', '');
      expect(() => getCredentialsKey()).toThrow('STORE_CREDENTIALS_KEY environment variable is not set');
    });

    it('should throw if key is not 32 bytes', () => {
      const shortKey = Buffer.alloc(16, 'x').toString('base64');
      vi.stubEnv('STORE_CREDENTIALS_KEY', shortKey);
      expect(() => getCredentialsKey()).toThrow('must be 32 bytes');
    });
  });

  describe('getCredentialsKeyId()', () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should return key ID from environment variable', () => {
      vi.stubEnv('STORE_CREDENTIALS_KEY_ID', 'v2');
      expect(getCredentialsKeyId()).toBe('v2');
    });

    it('should return default v1 if not set', () => {
      delete process.env.STORE_CREDENTIALS_KEY_ID;
      expect(getCredentialsKeyId()).toBe('v1');
    });
  });

  describe('encryptCredentials() + decryptCredentials()', () => {
    it('should encrypt and decrypt credentials correctly', () => {
      const encrypted = encryptCredentials(testPayload, testKey);

      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.tag).toBeTruthy();
      expect(encrypted.keyId).toBeTruthy();
      expect(encrypted.fingerprint).toBeTruthy();

      const decrypted = decryptCredentials(encrypted, testKey);

      expect(decrypted.provider).toBe(testPayload.provider);
      expect(decrypted.credentials).toEqual(testPayload.credentials);
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      const encrypted1 = encryptCredentials(testPayload, testKey);
      const encrypted2 = encryptCredentials(testPayload, testKey);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should produce same fingerprint for same input', () => {
      const encrypted1 = encryptCredentials(testPayload, testKey);
      const encrypted2 = encryptCredentials(testPayload, testKey);

      expect(encrypted1.fingerprint).toBe(encrypted2.fingerprint);
    });

    it('should fail decryption with wrong key', () => {
      const encrypted = encryptCredentials(testPayload, testKey);
      const wrongKey = Buffer.alloc(32, 'wrong');

      expect(() => decryptCredentials(encrypted, wrongKey)).toThrow();
    });

    it('should fail decryption with tampered ciphertext', () => {
      const encrypted = encryptCredentials(testPayload, testKey);
      encrypted.ciphertext = Buffer.from('tampered').toString('base64');

      expect(() => decryptCredentials(encrypted, testKey)).toThrow();
    });

    it('should fail decryption with tampered tag', () => {
      const encrypted = encryptCredentials(testPayload, testKey);
      encrypted.tag = Buffer.from('tampered1234567890').toString('base64');

      expect(() => decryptCredentials(encrypted, testKey)).toThrow();
    });
  });
});

