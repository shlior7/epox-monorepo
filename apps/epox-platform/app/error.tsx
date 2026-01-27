'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-destructive/5 blur-3xl" />
      </div>

      <div className="relative max-w-md text-center">
        {/* Error Icon */}
        <div className="mx-auto mb-6 w-fit rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>

        {/* Message */}
        <h1 className="mb-3 text-2xl font-semibold">Something Went Wrong</h1>
        <p className="mb-2 text-muted-foreground">
          We encountered an unexpected error. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mb-8 font-mono text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="glow">
            <Link href="/home" className="inline-flex items-center justify-center gap-2">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
