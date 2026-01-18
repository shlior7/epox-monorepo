import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** Breadcrumb or secondary navigation */
  breadcrumb?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30',
        'flex flex-col gap-4 px-8 py-5',
        'border-b border-border/50',
        'bg-background/80 backdrop-blur-xl',
        'sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="space-y-1">
        {breadcrumb && <div className="mb-2 text-sm text-muted-foreground">{breadcrumb}</div>}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}
