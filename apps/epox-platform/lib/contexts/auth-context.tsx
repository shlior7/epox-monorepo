'use client';

import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
// Only import client-side hooks (not server-side auth)
import { useSession, useUser, useOrganization, authClient } from 'visualizer-auth/client';

// ===== Types =====

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified?: boolean;
}

export interface AuthClient {
  id: string;
  name: string;
  slug?: string;
}

export interface AuthContextValue {
  // User info
  user: AuthUser | null;
  isAuthenticated: boolean;

  // Client/Organization info (the "client" the user belongs to)
  client: AuthClient | null;
  clientId: string | null;

  // Loading states
  isLoading: boolean;
  isLoadingUser: boolean;
  isLoadingClient: boolean;

  // Session
  session: unknown;

  // Actions
  signOut: () => Promise<void>;

  // Organization management
  setActiveOrganization: (organizationId: string) => Promise<void>;
  refetchOrganization: () => Promise<void>;
}

// ===== Context =====

const AuthContext = createContext<AuthContextValue | null>(null);

// ===== Provider =====

interface AuthProviderProps {
  children: ReactNode;
}

// Custom hook to fetch client data in dev/test mode
function useDevClient(userId: string | null, userIsLoading: boolean, isProduction: boolean) {
  const [clientData, setClientData] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isE2E = process.env.NEXT_PUBLIC_IS_E2E === 'true';

  useEffect(() => {
    // Wait for user session to finish loading
    if (userIsLoading) {
      return;
    }

    // Skip in production or if no user
    if (isProduction || !userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch client data from our custom endpoint
    fetch('/api/auth/client')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.clientId) {
          setClientData({ id: data.clientId, name: data.clientName || 'Test Client' });
        }
        setIsLoading(false);
      })
      .catch((error) => {
        // Silently fail - auth context will handle missing client data
        if (process.env.NODE_ENV === 'development' && !isE2E) {
          console.log('[useDevClient] Fetch error:', error);
        }
        setIsLoading(false);
      });
  }, [userId, userIsLoading, isProduction]);

  return { data: clientData, isLoading };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const sessionData = useSession();
  const userData = useUser();

  // Check NEXT_PUBLIC_IS_E2E first because yarn dev always sets NODE_ENV=development
  const isE2E = process.env.NEXT_PUBLIC_IS_E2E === 'true';
  const isProduction = process.env.NODE_ENV === 'production' && !isE2E;

  // Debug session loading (disabled in E2E tests to avoid console errors)
  useEffect(() => {
    if (!isE2E && process.env.NODE_ENV === 'development') {
      console.log('[AuthProvider] Session state:', {
        isPending: sessionData.isPending,
        hasSession: !!sessionData.data,
        hasUser: !!userData.data,
        userId: userData.data?.id,
      });
    }
  }, [sessionData.isPending, sessionData.data, userData.data, isE2E]);

  // Only use organization plugin in production
  // In dev/test, we get client info from session data directly
  const orgData = isProduction ? useOrganization() : { data: null, isPending: false, error: null };
  const devClientData = useDevClient(userData.data?.id ?? null, sessionData.isPending, isProduction);

  const value = useMemo<AuthContextValue>(() => {
    const user = userData.data
      ? {
          id: userData.data.id,
          email: userData.data.email,
          name: userData.data.name,
          image: userData.data.image ?? undefined,
          emailVerified: userData.data.emailVerified ?? false,
        }
      : null;

    // Organization maps to "client" in our data model
    let client: AuthClient | null = null;

    if (isProduction) {
      // Production: Use organization plugin data
      const orgDataTyped = orgData.data as { id?: string; name?: string; slug?: string } | null;
      client = orgDataTyped?.id
        ? {
            id: orgDataTyped.id,
            name: orgDataTyped.name ?? 'Unknown',
            slug: orgDataTyped.slug,
          }
        : null;
    } else {
      // Dev/Test: Use custom client data fetched from API
      client = devClientData.data
        ? {
            id: devClientData.data.id,
            name: devClientData.data.name,
          }
        : null;
    }

    return {
      user,
      isAuthenticated: !!user,
      client,
      clientId: client?.id ?? null,
      isLoading: sessionData.isPending || (isProduction ? orgData.isPending === true : devClientData.isLoading),
      isLoadingUser: sessionData.isPending,
      isLoadingClient: isProduction ? orgData.isPending === true : devClientData.isLoading,
      session: sessionData.data,

      // Sign out
      signOut: async () => {
        await authClient.signOut();
        window.location.href = '/login';
      },

      setActiveOrganization: async (organizationId: string) => {
        // Use Better Auth's client-side API if available
        const orgClient = authClient as any;
        if (typeof orgClient.organization?.setActive === 'function') {
          await orgClient.organization.setActive({ organizationId });
        }

        // Refetch to update context
        if (orgData.refetch) {
          await orgData.refetch();
        }
      },

      refetchOrganization: async () => {
        if (orgData.refetch) {
          await orgData.refetch();
        }
      },
    };
  }, [sessionData, userData, orgData, isProduction, devClientData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ===== Hook =====

// Default value returned when context is not yet available (during SSR/navigation transitions)
const defaultAuthValue: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  client: null,
  clientId: null,
  isLoading: true,
  isLoadingUser: true,
  isLoadingClient: true,
  session: null,
  signOut: async () => {},
  setActiveOrganization: async () => {},
  refetchOrganization: async () => {},
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  // Return default loading state when context is not available
  // This handles edge cases during Next.js App Router navigation transitions
  if (!context) {
    return defaultAuthValue;
  }

  return context;
}

/**
 * Get the current client ID or throw if not available.
 * Use this when you require a client ID and want to fail fast.
 */
export function useRequiredClientId(): string {
  const { clientId, isLoading } = useAuth();

  if (isLoading) {
    throw new Error('Auth is still loading');
  }

  if (!clientId) {
    throw new Error(
      'No client ID available - user may not be authenticated or assigned to a client'
    );
  }

  return clientId;
}

/**
 * Get the current client ID with a fallback for E2E tests only.
 * In production and development, returns empty string if not authenticated.
 */
export function useClientId(): string {
  const { clientId } = useAuth();

  // Only use fallback in E2E tests
  const isE2E = process.env.NEXT_PUBLIC_IS_E2E === 'true';

  // Fallback only for E2E tests
  if (!clientId && isE2E) {
    return 'test-client';
  }

  return clientId ?? '';
}
