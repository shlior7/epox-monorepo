'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSession, useUser, useOrganization, authClient } from '@/lib/services/auth';

// ===== Types =====

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
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

export function AuthProvider({ children }: AuthProviderProps) {
  const sessionData = useSession();
  const userData = useUser();
  const orgData = useOrganization();

  const value = useMemo<AuthContextValue>(() => {
    const user = userData.data
      ? {
          id: userData.data.id,
          email: userData.data.email,
          name: userData.data.name,
          image: userData.data.image ?? undefined,
        }
      : null;

    // Organization maps to "client" in our data model
    const orgDataTyped = orgData.data as { id?: string; name?: string; slug?: string } | null;
    const client = orgDataTyped?.id
      ? {
          id: orgDataTyped.id,
          name: orgDataTyped.name ?? 'Unknown',
          slug: orgDataTyped.slug,
        }
      : null;

    return {
      user,
      isAuthenticated: !!user,
      client,
      clientId: client?.id ?? null,
      isLoading: sessionData.isPending || orgData.isPending === true,
      isLoadingUser: sessionData.isPending,
      isLoadingClient: orgData.isPending === true,
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
  }, [sessionData, userData, orgData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ===== Hook =====

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
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
 * Get the current client ID with a fallback for development.
 * In production, this should be replaced with proper auth.
 */
export function useClientId(): string {
  const { clientId } = useAuth();

  // Fallback for development when auth isn't set up
  if (!clientId && process.env.NODE_ENV === 'development') {
    return 'test-client';
  }

  return clientId ?? 'test-client';
}
