import type { ERPProviderType, ProviderCredentials } from './provider';

export type StoreCredentialsPayload = {
  provider: ERPProviderType;
  credentials: ProviderCredentials;
};

export interface EncryptedCredentials {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
  fingerprint: string;
}
