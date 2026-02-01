import { ProjectCard } from "./ProjectCard";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { Loader2, FolderPlus } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/lib/utils";
import type { LearningProject } from "@/services/api/types/learningProjects";

interface ProjectsListProps {
  projects: LearningProject[];
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (project: LearningProject) => void;
  onStatusChange: (projectId: string, newStatus: string) => void;
  onDelete: (projectId: string) => void;
  onCreateNew?: () => void;
}

/**
 * ProjectsList - Deep Focus Design
 * 
 * Grid layout with empty state and infinite scroll.
 * Uses growth mood aesthetic throughout.
 */
export function ProjectsList({ 
  projects, 
  isLoadingMore,
  hasMore,
  onLoadMore,
  onEdit, 
  onStatusChange, 
  onDelete,
  onCreateNew,
}: ProjectsListProps) {
  const { loadMoreRef } = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore,
  });

  // Empty state
  if (projects.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-16",
        "bg-surface-sunken/50 dark:bg-surface-raised/30 rounded-xl",
        "border border-dashed border-border-subtle",
        "relative overflow-hidden"
      )}>
        {/* Subtle dot pattern background */}
        <div 
          className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--mood-growth-accent)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        
        <div className="text-center relative z-10 px-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken dark:bg-surface-raised mb-4">
            <FolderPlus className="h-7 w-7 text-mood-growth-accent" strokeWidth={1.5} />
          </div>
          
          {/* Title */}
          <h4 className="text-base font-medium text-text-primary mb-2">
            No projects yet
          </h4>
          
          {/* Description */}
          <p className="text-sm text-text-tertiary max-w-sm mx-auto mb-6">
            Start organizing your learning journey by creating your first project. Track sessions, take notes, and grow your knowledge.
          </p>
          
          {/* CTA */}
          {onCreateNew && (
            <Button onClick={onCreateNew} className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Create Your First Project
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Projects Grid - responsive 1-4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading more projects...</span>
            </div>
          ) : (
            <div className="text-text-muted text-xs">
              Scroll to load more
            </div>
          )}
        </div>
      )}

      {/* End of Results */}
      {!hasMore && projects.length > 0 && (
        <div className="text-center py-6">
          <p className="text-text-muted text-xs">
            End of projects
          </p>
        </div>
      )}
    </div>
  );
} 