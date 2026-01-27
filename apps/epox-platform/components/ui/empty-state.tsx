'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { buildTestId } from '@/lib/testing/testid';

type EmptyStateAction =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never };

interface EmptyStateProps {
  icon?: LucideIcon | React.ReactElement;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
  testId?: string;
}

function isLucideIcon(icon: LucideIcon | React.ReactElement): icon is LucideIcon {
  return typeof icon === 'function' || (typeof icon === 'object' && '$$typeof' in icon && typeof (icon as any).render === 'function');
}

export function EmptyState({
  icon,
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
      {icon && (
        <div className="mb-4 rounded-full bg-muted/50 p-4" data-testid={buildTestId(testId, 'icon')}>
          {isLucideIcon(icon) ? (
            React.createElement(icon, { className: 'h-10 w-10 text-muted-foreground' })
          ) : (
            <div className="text-muted-foreground">{icon}</div>
          )}
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
        action.href ? (
          <Button asChild variant="glow" testId={buildTestId(testId, 'action')}>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick} variant="glow" testId={buildTestId(testId, 'action')}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
