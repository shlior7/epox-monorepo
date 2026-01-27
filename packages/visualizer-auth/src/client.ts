import { createAuthClient } from 'better-auth/react';

const baseURL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

// Only enable organization plugin in production to avoid WebSocket issues in dev/test
// Check NEXT_PUBLIC_IS_E2E first because yarn dev always sets NODE_ENV=development
const isE2E = process.env.NEXT_PUBLIC_IS_E2E === 'true';
const isProduction = process.env.NODE_ENV === 'production' && !isE2E;

// Debug: Log environment detection (only in development, not E2E)
if (typeof window !== 'undefined' && !isProduction && !isE2E) {
  console.log('[Auth Client] Production mode:', isProduction, '| NODE_ENV:', process.env.NODE_ENV);
}

// Get plugins - only load organization plugin in production
const getPlugins = () => {
  if (isProduction) {
    // Dynamically import organization plugin only in production
    const { organizationClient } = require('better-auth/client/plugins');
    return [organizationClient()];
  }
  return [];
};

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  // Only enable organization plugin in production to avoid WebSocket connection issues
  // The useOrganization hook has fallback for when plugin is not available
  plugins: getPlugins(),
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
