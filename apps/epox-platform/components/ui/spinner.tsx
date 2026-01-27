'use client';

import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  testId?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({ size = 'md', className, testId }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-primary', sizeClasses[size], className)}
      data-testid={testId}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
  testId?: string;
}

export function LoadingOverlay({ message, testId }: LoadingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      data-testid={testId}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" testId={buildTestId(testId, 'spinner')} />
        {message && (
          <p
            className="text-sm text-muted-foreground"
            data-testid={buildTestId(testId, 'message')}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  testId?: string;
}

export function Skeleton({ className, testId }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted/50', className)} data-testid={testId} />
  );
}
