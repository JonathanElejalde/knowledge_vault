import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/Card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  /** Visual mood for the card */
  mood?: 'default' | 'focus' | 'insight' | 'content' | 'growth';
  /** Hero variant for primary stat - larger and more prominent */
  variant?: 'default' | 'hero';
  /** Additional CSS classes */
  className?: string;
}

const iconMoodClasses = {
  default: 'text-text-tertiary',
  focus: 'text-mood-focus-accent',
  insight: 'text-mood-insight-accent',
  content: 'text-text-tertiary',
  growth: 'text-mood-growth-accent',
} as const;

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
    <Card 
      mood={mood} 
      interactive 
      className={cn(
        'h-full',
        isHero && 'relative overflow-hidden',
        className
      )}
    >
      {/* Hero background decoration - subtle gradient overlay */}
      {isHero && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, var(--mood-focus-accent) 0%, transparent 50%)',
            opacity: 0.03,
          }}
        />
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          {title}
        </CardTitle>
        <Icon className={cn(
          iconMoodClasses[mood],
          isHero ? "h-5 w-5" : "h-4 w-4"
        )} />
      </CardHeader>
      <CardContent className="relative px-4 pb-3 pt-0">
        <div className={cn(
          "text-text-primary font-semibold tracking-tight",
          isHero ? "text-3xl" : "text-2xl"
        )}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-text-tertiary mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
