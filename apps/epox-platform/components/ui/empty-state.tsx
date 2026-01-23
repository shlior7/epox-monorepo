'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { buildTestId } from '@/lib/testing/testid';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  testId?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  testId,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-8 py-16 text-center', className)}
      data-testid={testId}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-muted/50 p-4" data-testid={buildTestId(testId, 'icon')}>
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold" data-testid={buildTestId(testId, 'title')}>
        {title}
      </h3>
      {description && (
        <p
          className="mb-6 max-w-md text-sm text-muted-foreground"
          data-testid={buildTestId(testId, 'description')}
        >
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="glow" testId={buildTestId(testId, 'action')}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
