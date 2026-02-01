import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  /** Visual mood for the card - affects border hover color */
  mood?: 'default' | 'focus' | 'insight' | 'content' | 'growth';
  /** Hero variant for primary stat - larger and more prominent */
  variant?: 'default' | 'hero';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Mood to hover border color mapping
 */
const moodHoverBorderClasses = {
  default: 'hover:border-border-default',
  focus: 'hover:border-mood-focus-accent/50',
  insight: 'hover:border-accent-primary/30',
  content: 'hover:border-border-default',
  growth: 'hover:border-mood-growth-accent/50',
} as const;

const iconMoodClasses = {
  default: 'text-text-muted group-hover:text-accent-primary',
  focus: 'text-text-muted group-hover:text-mood-focus-accent',
  insight: 'text-text-muted group-hover:text-accent-primary',
  content: 'text-text-muted',
  growth: 'text-text-muted group-hover:text-mood-growth-accent',
} as const;

const titleMoodClasses = {
  default: 'group-hover:text-text-secondary',
  focus: 'group-hover:text-mood-focus-accent',
  insight: 'group-hover:text-accent-primary',
  content: 'group-hover:text-text-secondary',
  growth: 'group-hover:text-mood-growth-accent',
} as const;

/**
 * SummaryCard - Deep Focus Design
 * 
 * Stat card with consistent height (h-32), clean hover effects,
 * and mood-aware styling. Matches the mockup's refined look.
 */
export default function SummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  mood = 'default',
  variant = 'default',
  className,
}: SummaryCardProps) {
  const isHero = variant === 'hero';
  
  return (
    <div 
      className={cn(
        // Base styles
        "group relative rounded-xl p-6 h-32",
        "bg-surface-base border border-border-subtle shadow-[var(--shadow-sm)]",
        // Flex layout for space-between
        "flex flex-col justify-between",
        // Hover effects
        "transition-colors duration-200",
        moodHoverBorderClasses[mood],
        // Hero variant styling
        isHero && "overflow-hidden",
        className
      )}
    >
      {/* Header row: Title + Icon */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs font-semibold uppercase tracking-wider",
          "text-text-tertiary transition-colors",
          titleMoodClasses[mood]
        )}>
          {title}
        </span>
        <Icon 
          className={cn(
            "h-5 w-5 transition-colors",
            iconMoodClasses[mood]
          )} 
          strokeWidth={1.5}
        />
      </div>
      
      {/* Value row: Large stat + description */}
      <div>
        <span className={cn(
          "text-text-primary font-bold tracking-tight",
          isHero ? "text-3xl" : "text-3xl"
        )}>
          {value}
        </span>
        {description && (
          <span className="ml-2 text-xs text-text-muted">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
