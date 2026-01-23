'use client';

import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';

// ===== PROPS =====

export interface ProductCountBadgeProps {
  sceneType: string;
  count: number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isActive?: boolean;
  className?: string;
}

// ===== COMPONENT =====

export function ProductCountBadge({
  sceneType,
  count,
  onClick,
  isActive = false,
  className,
}: ProductCountBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors',
        isActive
          ? 'bg-primary/20 text-primary'
          : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary',
        className
      )}
      data-testid={buildTestId('product-count-badge', sceneType)}
    >
      <Package className="h-3 w-3" />
      <span>{count}</span>
    </button>
  );
}
