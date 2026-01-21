'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard component that protects routes requiring authentication.
 * - Shows a loading skeleton while auth state is being determined
 * - Redirects to /login if user is not authenticated
 * - Renders children only when authenticated
 *
 * This is a client-side guard that works alongside the middleware.
 * The middleware handles the initial server-side redirect, while this
 * component handles cases where the session becomes invalid client-side.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, isLoadingUser } = useAuth();
  const router = useRouter();

  // Ensure consistent hydration by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect after loading is complete and user is not authenticated
    if (mounted && !isLoadingUser && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isLoadingUser, isAuthenticated, router]);

  // Always show skeleton on server and initial client render to avoid hydration mismatch
  if (!mounted || isLoadingUser) {
    return <>{fallback ?? <AuthLoadingSkeleton />}</>;
  }

  // Show loading while redirect is happening (user not authenticated)
  if (!isAuthenticated) {
    return <>{fallback ?? <AuthLoadingSkeleton />}</>;
  }

  return <>{children}</>;
}

function AuthLoadingSkeleton() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r border-border bg-card p-4">
        <Skeleton className="mb-8 h-8 w-32" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 p-8">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="mb-2 h-4 w-48" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuthGuard;
