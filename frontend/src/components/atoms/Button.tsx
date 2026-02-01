import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button Component
 * 
 * Enhanced with design token integration and modern variants.
 * Uses CSS custom properties for dynamic theming.
 */

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-[var(--button-gap)]',
    'rounded-[var(--button-radius)] text-label font-medium',
    'transition-all duration-[var(--motion-duration)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-accent-primary !text-white',
          'hover:bg-accent-primary-hover',
          'shadow-[var(--shadow-sm)]',
          'hover:shadow-[var(--shadow-md)]',
        ].join(' '),
        destructive: [
          'bg-danger !text-white',
          'hover:bg-danger/90',
        ].join(' '),
        outline: [
          'border border-border-default bg-transparent',
          'hover:bg-surface-sunken hover:border-border-strong',
          'text-text-primary',
        ].join(' '),
        secondary: [
          'bg-surface-sunken text-text-primary',
          'hover:bg-surface-sunken/80',
          'border border-border-subtle',
        ].join(' '),
        ghost: [
          'hover:bg-surface-sunken',
          'text-text-secondary hover:text-text-primary',
        ].join(' '),
        link: [
          'text-accent-primary underline-offset-4',
          'hover:underline',
        ].join(' '),
        // New mood-aware variants
        focus: [
          'bg-mood-focus-accent !text-white',
          'hover:opacity-90',
          'shadow-[var(--shadow-focus)]',
        ].join(' '),
        insight: [
          'bg-mood-insight-accent !text-white',
          'hover:opacity-90',
        ].join(' '),
        growth: [
          'bg-mood-growth-accent !text-white',
          'hover:opacity-90',
        ].join(' '),
      },
      size: {
        default: 'h-10 px-[var(--button-padding-x)] py-[var(--button-padding-y)]',
        sm: 'h-9 px-[var(--button-padding-x-sm)] py-[var(--button-padding-y-sm)] text-body-sm',
        lg: 'h-11 px-[var(--button-padding-x-lg)] py-[var(--button-padding-y-lg)]',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Show loading state */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
