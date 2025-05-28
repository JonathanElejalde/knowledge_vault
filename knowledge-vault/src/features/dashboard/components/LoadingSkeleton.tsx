import { Card, CardContent, CardHeader } from "@/components/atoms/Card";

interface LoadingSkeletonProps {
  className?: string;
}

export function ChartLoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-full bg-muted rounded-md"></div>
    </div>
  );
}

export function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
        <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-16 mb-2 animate-pulse"></div>
        <div className="h-3 bg-muted rounded w-20 animate-pulse"></div>
      </CardContent>
    </Card>
  );
} 