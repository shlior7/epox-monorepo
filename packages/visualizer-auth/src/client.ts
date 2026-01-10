import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

const baseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL;

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  plugins: [organizationClient()],
});

export const { useSession } = authClient;

export function useUser() {
  const session = authClient.useSession();
  return {
    ...session,
    data: session.data?.user ?? null,
  };
}

export function useOrganization() {
  const client = authClient as typeof authClient & {
    useActiveOrganization?: () => {
      data: unknown;
      isPending?: boolean;
      error?: unknown;
      refetch?: () => Promise<unknown>;
    };
  };

  if (typeof client.useActiveOrganization === 'function') {
    return client.useActiveOrganization();
  }

  return {
    data: null,
    isPending: false,
    error: null,
    refetch: async () => null,
  };
}
