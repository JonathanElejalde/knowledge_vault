import React from 'react';
import { cn } from '@/lib/utils';

/**
 * BentoGrid
 * 
 * A modern asymmetric grid layout system inspired by Apple, Linear, and Vercel.
 * Supports variable column spans and heights for visual interest.
 */

interface BentoGridProps {
  children: React.ReactNode;
  /** Number of columns in the grid */
  columns?: 2 | 3 | 4;
  /** Gap size between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
} as const;

const columnClasses = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
} as const;

export function BentoGrid({
  children,
  columns = 4,
  gap = 'md',
  className,
}: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid',
        columnClasses[columns],
        gapClasses[gap],
        'stagger-children',
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoItemProps {
  children: React.ReactNode;
  /** Number of columns to span (1-4) */
  span?: 1 | 2 | 3 | 4;
  /** Height variant */
  height?: 'auto' | 'short' | 'default' | 'tall' | 'hero';
  /** Make this item span full width on mobile */
  fullWidthMobile?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const spanClasses = {
  1: '',
  2: 'md:col-span-2',
  3: 'md:col-span-2 lg:col-span-3',
  4: 'md:col-span-2 lg:col-span-4',
} as const;

const heightClasses = {
  auto: '',
  short: 'min-h-[8rem]',
  default: 'min-h-[12rem]',
  tall: 'min-h-[18rem]',
  hero: 'min-h-[24rem]',
} as const;

export function BentoItem({
  children,
  span = 1,
  height = 'auto',
  fullWidthMobile = false,
  className,
}: BentoItemProps) {
  return (
    <div
      className={cn(
        spanClasses[span],
        heightClasses[height],
        fullWidthMobile && 'col-span-full md:col-span-1',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * BentoCard
 * 
 * A specialized card component designed for Bento layouts.
 * Includes hover effects and optional gradient backgrounds.
 */
interface BentoCardProps {
  children: React.ReactNode;
  /** Visual mood/style of the card */
  mood?: 'default' | 'focus' | 'insight' | 'content' | 'growth';
  /** Enable hover lift effect */
  interactive?: boolean;
  /** Gradient direction for mood backgrounds */
  gradientDirection?: 'to-br' | 'to-r' | 'to-b';
  /** Additional CSS classes */
  className?: string;
  /** Click handler for interactive cards */
  onClick?: () => void;
}

const moodClasses = {
  default: 'bg-surface-base border-border-subtle',
  focus: 'bg-gradient-to-br from-mood-focus-bg to-mood-focus-bg/80 border-mood-focus-border',
  insight: 'bg-gradient-to-br from-mood-insight-bg to-mood-insight-bg/80 border-mood-insight-border',
  content: 'bg-mood-content-bg border-mood-content-border',
  growth: 'bg-gradient-to-br from-mood-growth-bg to-mood-growth-bg/80 border-mood-growth-border',
} as const;

export function BentoCard({
  children,
  mood = 'default',
  interactive = false,
  className,
  onClick,
}: BentoCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      className={cn(
        'rounded-[var(--card-radius)] border p-[var(--card-padding)] h-full',
        'transition-all duration-[var(--motion-duration)]',
        moodClasses[mood],
        interactive && 'hover-lift cursor-pointer',
        'shadow-[var(--shadow-sm)]',
        onClick && 'w-full text-left',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

export default BentoGrid;
