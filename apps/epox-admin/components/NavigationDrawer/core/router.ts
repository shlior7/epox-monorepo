import { useRouter } from 'next/navigation';

export interface RouterService {
  toClientSettings(clientId: string): void;
  toProductSettings(clientId: string, productId: string): void;
  toClientSession(clientId: string, clientSessionId: string): void;
  home(): void;
}

export function useRouterService(): RouterService {
  const router = useRouter();

  return {
    toClientSettings: (clientId: string) => router.push(`/${clientId}/settings`),
    toProductSettings: (clientId: string, productId: string) => router.push(`/${clientId}/${productId}/settings`),
    toClientSession: (clientId: string, sessionId: string) => router.push(`/${clientId}/client-session/${sessionId}`),
    home: () => router.push('/'),
  };
}
