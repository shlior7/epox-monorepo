import type { ProviderType, ProviderCredentials } from '../providers';

export interface StoreCredentialsPayload {
  provider: ProviderType;
  credentials: ProviderCredentials;
}

export interface EncryptedCredentials {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
  fingerprint: string | null;
}
