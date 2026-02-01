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
  /** Additional CSS classes */
  className?: string;
  /** Style props for animation delays */
  style?: React.CSSProperties;
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
  className,
  style,
}: SummaryCardProps) {
  return (
    <Card 
      mood={mood} 
      interactive 
      className={cn('animate-fade-in-up h-full', className)}
      style={style}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-label text-text-secondary">{title}</CardTitle>
        <Icon className={cn("h-5 w-5", iconMoodClasses[mood])} />
      </CardHeader>
      <CardContent>
        <div className="text-stat text-text-primary">{value}</div>
        {description && (
          <p className="text-caption text-text-tertiary mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
