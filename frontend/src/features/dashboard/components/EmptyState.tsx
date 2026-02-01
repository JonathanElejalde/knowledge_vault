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
  };
  /** Visual mood to match parent card */
  mood?: 'focus' | 'insight' | 'growth' | 'content';
  className?: string;
}

const iconMoodClasses = {
  focus: 'text-mood-focus-accent',
  insight: 'text-mood-insight-accent',
  growth: 'text-mood-growth-accent',
  content: 'text-text-muted',
} as const;

const buttonMoodVariants = {
  focus: 'focus' as const,
  insight: 'default' as const,
  growth: 'growth' as const,
  content: 'default' as const,
} as const;

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  mood = 'content',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-6 px-4 text-center h-full",
      className
    )}>
      {/* Icon */}
      <div className="mb-3 p-3 rounded-full bg-surface-sunken">
        <Icon className={cn("h-5 w-5 opacity-60", iconMoodClasses[mood])} strokeWidth={1.5} />
      </div>
      
      {/* Title */}
      <p className="text-sm font-medium text-text-secondary mb-1">
        {title}
      </p>
      
      {/* Description */}
      {description && (
        <p className="text-xs text-text-tertiary max-w-[200px] mb-3">
          {description}
        </p>
      )}
      
      {/* CTA Button */}
      {action && (
        <Button 
          variant={buttonMoodVariants[mood]}
          size="sm"
          onClick={action.onClick}
          className="text-xs"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
