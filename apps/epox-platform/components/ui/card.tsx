import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('rounded-xl border text-card-foreground transition-all duration-200', {
  variants: {
    variant: {
      // Default - Clean card with subtle border
      default: 'border-border bg-card',

      // Elevated - With shadow for depth
      elevated: 'border-border bg-card shadow-card',

      // Glass - Frosted glass effect
      glass: 'border-border/50 bg-card/60 backdrop-blur-xl',

      // Gradient border - Premium look
      gradient: ['bg-gradient-to-b from-card to-card', 'border-0', 'gradient-border-subtle'],

      // Accent - Subtle primary tint
      accent: 'border-primary/20 bg-primary/5',

      // Interactive - For clickable cards
      interactive: [
        'border-border bg-card',
        'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5',
        'cursor-pointer',
      ],

      // Glow - With ambient glow
      glow: ['border-primary/30 bg-card', 'shadow-lg shadow-primary/10'],
    },
    padding: {
      none: '',
      sm: 'p-4',
      default: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'none',
  },
});

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  hover?: boolean;
  testId?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hover, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, padding }),
        hover && 'cursor-pointer hover:border-primary/50 hover:shadow-md',
        className
      )}
      data-testid={testId}
      {...props}
    />
  )
);
Card.displayName = 'Card';

interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  testId?: string;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      data-testid={testId}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

interface CardTextProps extends React.HTMLAttributes<HTMLHeadingElement> {
  testId?: string;
}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTextProps>(
  ({ className, testId, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      data-testid={testId}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  testId?: string;
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, testId, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      data-testid={testId}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, testId, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} data-testid={testId} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      data-testid={testId}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
