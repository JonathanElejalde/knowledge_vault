import React from 'react';
import { Skeleton } from '@/components/atoms/Skeleton';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';
import { useProjects } from '@/features/projects/hooks/internal';
import { cn } from '@/lib/utils';
import type { LearningProject } from '@/services/api/types/learningProjects';

interface ProjectsSidebarProps {
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
}

/**
 * ProjectsSidebar - Deep Focus Design
 * 
 * Project filter list with clean styling and design token consistency.
 * Note: This component is rendered inside a Card, so no Card wrapper here.
 */
export function ProjectsSidebar({ selectedProjectId, onProjectSelect }: ProjectsSidebarProps) {
  const { 
    projects, 
    isLoading, 
    error, 
    setActiveTab, 
    loadMore, 
    isLoadingMore, 
    hasMore,
    searchQuery,
    setSearchQuery
  } = useProjects();
  
  React.useEffect(() => {
    setActiveTab('all');
  }, [setActiveTab]);

  const [showAllCompleted, setShowAllCompleted] = React.useState(false);
  const maxCompletedToShow = 5;

  const inProgressProjects = React.useMemo(() => {
    return projects.filter(project => project.status === 'in_progress');
  }, [projects]);

  const completedProjects = React.useMemo(() => {
    return projects.filter(project => project.status === 'completed');
  }, [projects]);

  const totalNotesCount = React.useMemo(() => {
    return projects.reduce((total, project) => total + project.notes_count, 0);
  }, [projects]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (error) {
    return (
      <div className="text-sm text-semantic-danger text-center py-4">
        Failed to load projects
      </div>
    );
  }

  const renderProjectItem = (project: LearningProject) => (
    <button
      key={project.id}
      type="button"
      className={cn(
        "w-full flex justify-between items-center px-3 py-2 rounded-md",
        "text-left text-sm transition-colors",
        "hover:bg-surface-sunken",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
        selectedProjectId === project.id 
          ? "bg-accent-primary-subtle text-accent-primary font-medium" 
          : "text-text-secondary"
      )}
      onClick={() => onProjectSelect(project.id)}
    >
      <span className="truncate pr-2">{project.name}</span>
      <span className={cn(
        "text-[10px] px-2 py-0.5 rounded-full flex-shrink-0",
        selectedProjectId === project.id 
          ? "bg-accent-primary/20 text-accent-primary" 
          : "bg-surface-sunken text-text-muted"
      )}>
        {project.notes_count}
      </span>
    </button>
  );

  return (
    <div className="space-y-1">
      {/* All Projects option */}
      <button
        type="button"
        className={cn(
          "w-full flex justify-between items-center px-3 py-2 rounded-md",
          "text-left text-sm font-medium transition-colors",
          "hover:bg-surface-sunken",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
          selectedProjectId === null 
            ? "bg-accent-primary-subtle text-accent-primary" 
            : "text-text-primary"
        )}
        onClick={() => onProjectSelect(null)}
      >
        <span>All Projects</span>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full",
          selectedProjectId === null 
            ? "bg-accent-primary/20 text-accent-primary" 
            : "bg-surface-sunken text-text-muted"
        )}>
          {totalNotesCount}
        </span>
      </button>

      {/* Search Projects */}
      <div className="py-2">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
          <Input
            type="text"
            placeholder="Search projects..."
            className="pl-8 h-8 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center px-3 py-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          {/* Search results indicator */}
          {searchQuery.trim() && projects.length > 0 && (
            <div className="text-[10px] text-text-muted px-3 pb-2">
              Found {projects.length} project{projects.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* In Progress Projects */}
          {inProgressProjects.length > 0 && (
            <div className="pt-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary px-3 pb-2">
                In Progress
              </h4>
              <div className="space-y-0.5">
                {inProgressProjects.map(renderProjectItem)}
              </div>
            </div>
          )}

          {/* Completed Projects */}
          {completedProjects.length > 0 && (
            <div className="pt-3">
              <div className="flex items-center justify-between px-3 pb-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Completed
                </h4>
                {completedProjects.length > maxCompletedToShow && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-[10px] text-text-muted hover:text-accent-primary"
                    onClick={() => setShowAllCompleted(!showAllCompleted)}
                  >
                    {showAllCompleted ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-0.5" />
                        Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-0.5" />
                        All ({completedProjects.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="space-y-0.5">
                {(showAllCompleted ? completedProjects : completedProjects.slice(0, maxCompletedToShow))
                  .map(renderProjectItem)}
              </div>
            </div>
          )}

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="px-3 py-2 opacity-60">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 && (
            <div className="text-xs text-text-muted text-center py-6">
              {searchQuery.trim() ? `No projects found` : 'No projects yet'}
            </div>
          )}

          {/* Load More button */}
          {hasMore && projects.length > 0 && (
            <div className="pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 