import { Card, CardContent, CardHeader } from "@/components/atoms/Card"
import { Skeleton } from "@/components/atoms/Skeleton"

/**
 * ProjectsLoading - Deep Focus Design
 * 
 * Skeleton layout matching the updated ProjectsPage structure.
 */
export default function ProjectsLoading() {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8">
      {/* Header Section Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <Skeleton className="h-9 w-56 mb-3" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-80 hidden sm:block" />
      </div>

      {/* Projects Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="flex-1">
              {/* Category */}
              <Skeleton className="h-3 w-20 mb-4" />
              {/* Title */}
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-3/4 mb-3" />
              {/* Description */}
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              {/* Status */}
              <div className="flex items-center gap-2 mt-auto">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Stats Row */}
              <div className="flex items-center justify-between py-3 border-t border-border-subtle">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              {/* Button */}
              <Skeleton className="h-8 w-full mb-3" />
              {/* Date */}
              <Skeleton className="h-3 w-32 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 