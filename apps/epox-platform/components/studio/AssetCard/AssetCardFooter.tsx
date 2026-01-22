// ============================================================================
// Card Footer
// ============================================================================

import { cn } from '../../../lib/utils';

interface AssetCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function AssetCardFooter({ children, className }: AssetCardFooterProps) {
  return (
    <div className={cn('border-t border-border bg-card px-2 py-2', className)}>{children}</div>
  );
}
