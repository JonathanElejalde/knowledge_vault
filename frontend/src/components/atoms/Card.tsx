import * as React from "react";
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from "@/lib/utils";

/**
 * Card Component with Mood System
 * 
 * Moods provide semantic visual differentiation:
 * - default: Neutral card for general content
 * - focus: Warm tones for Pomodoro, timers, active tasks
 * - insight: Cool tones for dashboard, stats, analytics
 * - content: Clean, readable for notes, text content
 * - growth: Green tones for projects, progress tracking
 */

const cardVariants = cva(
  'rounded-[var(--card-radius)] border transition-all duration-[var(--motion-duration)]',
  {
    variants: {
      mood: {
        default: 'bg-surface-base border-border-subtle shadow-[var(--shadow-sm)]',
        focus: [
          'bg-gradient-to-br from-mood-focus-bg to-mood-focus-bg/80',
          'border-mood-focus-border',
          'shadow-[var(--shadow-sm)]',
        ].join(' '),
        insight: [
          'bg-gradient-to-br from-mood-insight-bg to-mood-insight-bg/80',
          'border-mood-insight-border',
          'shadow-[var(--shadow-sm)]',
        ].join(' '),
        content: 'bg-mood-content-bg border-mood-content-border shadow-[var(--shadow-xs)]',
        growth: [
          'bg-gradient-to-br from-mood-growth-bg to-mood-growth-bg/80',
          'border-mood-growth-border',
          'shadow-[var(--shadow-sm)]',
        ].join(' '),
      },
      interactive: {
        true: 'hover:shadow-[var(--shadow-md)] hover:border-border-strong cursor-pointer hover:-translate-y-0.5',
        false: '',
      },
      size: {
        default: '',
        compact: 'p-3',
        spacious: 'p-6',
      },
    },
    defaultVariants: {
      mood: 'default',
      interactive: false,
      size: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, mood, interactive, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ mood, interactive, size, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-[var(--card-padding)]", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-heading-4 text-text-primary",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-body-sm text-text-secondary", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("p-[var(--card-padding)] pt-0", className)} 
    {...props} 
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-[var(--card-padding)] pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
