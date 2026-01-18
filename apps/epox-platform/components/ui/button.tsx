import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  // Base styles - refined for premium feel
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'text-sm font-medium',
    'rounded-lg',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        // Primary - Vibrant with glow effect
        default: [
          'bg-primary font-semibold text-primary-foreground',
          'shadow-md shadow-primary/20',
          'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30',
        ],

        // Destructive - For dangerous actions
        destructive: [
          'bg-destructive text-destructive-foreground',
          'shadow-sm shadow-destructive/10',
          'hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/20',
        ],

        // Outline - Subtle border with hover fill
        outline: [
          'border border-border bg-transparent',
          'hover:border-border-strong hover:bg-secondary hover:text-secondary-foreground',
        ],

        // Secondary - Muted background
        secondary: ['bg-secondary text-secondary-foreground', 'hover:bg-secondary/80'],

        // Ghost - Minimal, just text with hover background
        ghost: ['hover:bg-secondary hover:text-secondary-foreground'],

        // Link - Text only with underline
        link: ['text-primary underline-offset-4', 'hover:underline'],

        // Glow - Premium CTA with animated glow
        glow: [
          'bg-primary font-semibold text-primary-foreground',
          'shadow-lg shadow-primary/30',
          'hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/40',
          'active:scale-[0.98]',
        ],

        // Aurora - Gradient animates on hover only
        aurora: [
          'font-semibold text-white',
          'bg-gradient-aurora bg-[length:200%_200%]',
          'shadow-lg shadow-indigo-500/30',
          'hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/40',
          'hover:animate-gradient-shift',
        ],

        // Warm - Amber/gold premium accent
        warm: [
          'bg-gradient-to-r from-amber-500 to-amber-400',
          'font-semibold text-charcoal-900',
          'shadow-md shadow-amber-500/20',
          'hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/30',
        ],

        // Glass - Frosted glass effect
        glass: [
          'bg-card/60 backdrop-blur-xl',
          'border border-border/50',
          'text-foreground',
          'hover:border-border hover:bg-card/80',
        ],

        // Success - For confirmations
        success: [
          'bg-success font-semibold text-success-foreground',
          'shadow-md shadow-success/20',
          'hover:bg-success/90 hover:shadow-lg hover:shadow-success/30',
        ],
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // When using asChild with icons/loading, Slot needs a single element (not Fragment)
    // So we always wrap content when using asChild
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled || isLoading}
          {...props}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? <span>{children}</span> : children}
            {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </span>
        </Comp>
      );
    }

    // Normal button rendering (not asChild)
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLoading ? <span>{children}</span> : children}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
