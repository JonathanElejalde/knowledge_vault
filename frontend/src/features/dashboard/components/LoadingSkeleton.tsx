import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
}

export function ChartLoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn(
      "rounded-lg skeleton-shimmer bg-surface-sunken/50",
      className
    )} />
  );
}

/**
 * SummaryCardSkeleton - matches the new SummaryCard h-32 design
 */
export function SummaryCardSkeleton() {
  return (
    <div className={cn(
      "rounded-xl p-6 h-32",
      "bg-surface-base border border-border-subtle",
      "flex flex-col justify-between"
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="h-3 rounded w-24 skeleton-shimmer" />
        <div className="h-5 w-5 rounded skeleton-shimmer" />
      </div>
      
      {/* Value row */}
      <div className="flex items-baseline gap-2">
        <div className="h-8 rounded w-16 skeleton-shimmer" />
        <div className="h-3 rounded w-20 skeleton-shimmer" />
      </div>
    </div>
  );
}
