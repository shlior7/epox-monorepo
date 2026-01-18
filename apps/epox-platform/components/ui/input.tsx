import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Search, Eye, EyeOff } from 'lucide-react';

const inputVariants = cva(
  [
    'flex w-full rounded-lg border bg-background text-sm transition-all duration-200',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        // Default - Clean with focus ring
        default: [
          'border-input',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        ],

        // Ghost - Minimal border, subtle
        ghost: [
          'border-transparent bg-secondary/50',
          'hover:bg-secondary',
          'focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-ring',
        ],

        // Filled - Solid background
        filled: [
          'border-transparent bg-muted',
          'hover:bg-muted/80',
          'focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
        ],

        // Glass - Frosted effect
        glass: [
          'border-border/50 bg-card/60 backdrop-blur-sm',
          'focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20',
        ],
      },
      inputSize: {
        sm: 'h-9 px-3 text-xs',
        default: 'h-10 px-3',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, error, leftIcon, rightIcon, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';

    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <input
          type={isPassword && showPassword ? 'text' : type}
          className={cn(
            inputVariants({ variant, inputSize }),
            error && 'border-destructive focus-visible:ring-destructive',
            leftIcon && 'pl-10',
            (rightIcon || isPassword) && 'pr-10',
            className
          )}
          ref={ref}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {rightIcon && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {rightIcon}
          </div>
        )}
        {error && <p className="mt-1.5 animate-fade-in text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, onChange, variant = 'ghost', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onSearch?.(e.target.value);
    };

    return (
      <Input
        ref={ref}
        type="search"
        variant={variant}
        leftIcon={<Search className="h-4 w-4" />}
        className={className}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
SearchInput.displayName = 'SearchInput';

export { Input, SearchInput, inputVariants };
