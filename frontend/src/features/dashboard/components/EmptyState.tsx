import { Button } from "@/components/atoms/Button";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  /** Visual mood to match parent card */
  mood?: 'focus' | 'insight' | 'growth' | 'content';
  /** Whether to show the dotted border container (default: true) */
  showContainer?: boolean;
  className?: string;
}

const iconBgClasses = {
  focus: 'bg-surface-sunken dark:bg-surface-raised',
  insight: 'bg-surface-sunken dark:bg-surface-raised',
  growth: 'bg-surface-sunken dark:bg-surface-raised',
  content: 'bg-surface-sunken dark:bg-surface-raised',
} as const;

const iconMoodClasses = {
  focus: 'text-mood-focus-accent',
  insight: 'text-accent-primary',
  growth: 'text-mood-growth-accent',
  content: 'text-text-muted',
} as const;

/**
 * EmptyState - Deep Focus Design
 * 
 * Engaging empty state with:
 * - Dotted border container (matches mockup)
 * - Soft dot pattern background
 * - Centered icon, title, description, CTA
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  mood = 'content',
  showContainer = true,
  className,
}: EmptyStateProps) {
  const content = (
    <div className="text-center p-6 relative z-10">
      {/* Icon in circle */}
      <div className={cn(
        "inline-flex items-center justify-center h-12 w-12 rounded-full mb-4",
        iconBgClasses[mood]
      )}>
        <Icon 
          className={cn("h-6 w-6", iconMoodClasses[mood])} 
          strokeWidth={1.5} 
        />
      </div>
      
      {/* Title */}
      <h4 className="text-sm font-medium text-text-primary mb-1">
        {title}
      </h4>
      
      {/* Description */}
      {description && (
        <p className="text-xs text-text-tertiary max-w-xs mx-auto mb-4">
          {description}
        </p>
      )}
      
      {/* CTA Button */}
      {action && (
        <Button 
          variant={action.variant === 'secondary' ? 'outline' : 'default'}
          size="sm"
          onClick={action.onClick}
          className="text-xs"
        >
          {action.label}
        </Button>
      )}
    </div>
  );

  if (!showContainer) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center h-full",
        className
      )}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn(
      "h-full flex items-center justify-center",
      "bg-surface-sunken/50 dark:bg-surface-raised/30 rounded-lg",
      "border border-dashed border-border-subtle",
      "relative overflow-hidden",
      className
    )}>
      {/* Subtle dot pattern background */}
      <div 
        className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--accent-primary)) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      {content}
    </div>
  );
}
