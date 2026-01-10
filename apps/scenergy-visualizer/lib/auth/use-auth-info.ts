'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AppRole } from './roles';

type AdminSession = {
  id: string;
  email: string;
  name: string;
};

type AuthInfo = {
  session: AdminSession | null;
  role: AppRole | null;
  isLoading: boolean;
  refreshRole: () => Promise<void>;
};

export function useAuthInfo(): AuthInfo {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRole = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/session', { cache: 'no-store' });
      if (!response.ok) {
        setSession(null);
        return;
      }
      const data = await response.json();
      setSession((data?.session as AdminSession | null) ?? null);
    } catch (error) {
      console.error('Failed to fetch admin session:', error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRole();
  }, [refreshRole]);

  return {
    session,
    role: session ? 'admin' : null,
    isLoading,
    refreshRole,
  };
}
