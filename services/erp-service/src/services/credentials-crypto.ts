import crypto from 'node:crypto';
import type { EncryptedCredentials, StoreCredentialsPayload } from '../types/credentials';

const KEY_ENV = 'STORE_CREDENTIALS_KEY';
const KEY_ID_ENV = 'STORE_CREDENTIALS_KEY_ID';

export function getCredentialsKey(): Buffer {
  const keyBase64 = process.env[KEY_ENV];
  if (!keyBase64) {
    throw new Error(`${KEY_ENV} environment variable is not set`);
  }

  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must be 32 bytes (base64-encoded)`);
  }

  return key;
}

export function getCredentialsKeyId(): string {
  return process.env[KEY_ID_ENV] ?? 'v1';
}

export function encryptCredentials(payload: StoreCredentialsPayload, key: Buffer = getCredentialsKey()): EncryptedCredentials {
  const plaintext = JSON.stringify(payload);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const fingerprint = crypto.createHash('sha256').update(plaintext).digest('hex');

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyId: getCredentialsKeyId(),
    fingerprint,
  };
}

export function decryptCredentials(encrypted: EncryptedCredentials, key: Buffer = getCredentialsKey()): StoreCredentialsPayload {
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(decrypted.toString('utf8')) as StoreCredentialsPayload;
}
