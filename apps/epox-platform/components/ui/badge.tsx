import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1',
    'rounded-full border',
    'px-2.5 py-0.5',
    'text-xs font-semibold',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  ],
  {
    variants: {
      variant: {
        // Primary - Vibrant indigo
        default: ['border-primary/30 bg-primary/15 text-primary', 'hover:bg-primary/20'],

        // Secondary - Muted
        secondary: [
          'border-border bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80',
        ],

        // Destructive - For errors/warnings
        destructive: [
          'border-destructive/30 bg-destructive/15 text-destructive',
          'hover:bg-destructive/20',
        ],

        // Outline - Just border
        outline: ['border-border bg-transparent text-foreground', 'hover:bg-secondary'],

        // Success - Green
        success: ['border-success/30 bg-success/15 text-success', 'hover:bg-success/20'],

        // Warning - Amber
        warning: ['border-warning/30 bg-warning/15 text-warning', 'hover:bg-warning/20'],

        // Muted - Very subtle
        muted: ['border-border/50 bg-muted text-muted-foreground', 'hover:bg-muted/80'],

        // Accent - Cyan
        accent: ['border-accent/30 bg-accent/15 text-accent', 'hover:bg-accent/20'],

        // Premium - Gold/Amber solid
        premium: [
          'border-transparent bg-gradient-to-r from-amber-500 to-amber-400',
          'font-bold text-charcoal-900',
        ],

        // Processing - Subtle styling, animation only on hover
        processing: ['border-primary/30 bg-primary/10 text-primary'],
      },
      size: {
        sm: 'px-2 py-px text-[10px]',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  removable?: boolean;
  onRemove?: () => void;
  /** Optional dot indicator before text */
  dot?: boolean;
}

function Badge({
  className,
  variant,
  size,
  removable,
  onRemove,
  dot,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', 'bg-current opacity-80')} />}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className={cn(
            '-mr-0.5 ml-0.5',
            'h-3.5 w-3.5 rounded-full',
            'inline-flex items-center justify-center',
            'hover:bg-current/20',
            'transition-colors duration-150'
          )}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

export { Badge, badgeVariants };
