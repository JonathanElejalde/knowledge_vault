import { Card, CardContent, CardHeader } from "@/components/atoms/Card";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
}

export function ChartLoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn("rounded-md skeleton-shimmer", className)} />
  );
}

export function SummaryCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
        <div className="h-3 rounded w-20 skeleton-shimmer" />
        <div className="h-4 w-4 rounded skeleton-shimmer" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="h-7 rounded w-14 mb-2 skeleton-shimmer" />
        <div className="h-3 rounded w-16 skeleton-shimmer" />
      </CardContent>
    </Card>
  );
}
