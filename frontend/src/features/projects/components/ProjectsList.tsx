import { ProjectCard } from "./ProjectCard";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";
import type { LearningProject } from "@/services/api/types/learningProjects";

interface ProjectsListProps {
  projects: LearningProject[];
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (project: LearningProject) => void;
  onStatusChange: (projectId: string, newStatus: string) => void;
  onDelete: (projectId: string) => void;
}

export function ProjectsList({ 
  projects, 
  isLoadingMore,
  hasMore,
  onLoadMore,
  onEdit, 
  onStatusChange, 
  onDelete 
}: ProjectsListProps) {
  const { loadMoreRef } = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore,
  });

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No projects found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Create your first learning project to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more projects...</span>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              Scroll down to load more projects
            </div>
          )}
        </div>
      )}

      {/* End of Results */}
      {!hasMore && projects.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            You've reached the end of your projects
          </p>
        </div>
      )}
    </div>
  );
} 