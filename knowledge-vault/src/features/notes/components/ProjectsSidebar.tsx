import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/Card';
import { Skeleton } from '@/components/atoms/Skeleton';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';
import { useProjects } from '@/features/projects/hooks/internal';
import type { LearningProject } from '@/services/api/types/learningProjects';

interface ProjectsSidebarProps {
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
}

export function ProjectsSidebar({ selectedProjectId, onProjectSelect }: ProjectsSidebarProps) {
  // Don't filter by status to get all projects with their notes_count
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
  
  // Set the tab to 'all' to get both in_progress and completed projects
  React.useEffect(() => {
    setActiveTab('all');
  }, [setActiveTab]);

  // State for showing/hiding completed projects
  const [showAllCompleted, setShowAllCompleted] = React.useState(false);
  const maxCompletedToShow = 5;

  // Separate projects by status
  const inProgressProjects = React.useMemo(() => {
    return projects.filter(project => project.status === 'in_progress');
  }, [projects]);

  const completedProjects = React.useMemo(() => {
    return projects.filter(project => project.status === 'completed');
  }, [projects]);

  // Calculate total notes count across all projects
  const totalNotesCount = React.useMemo(() => {
    return projects.reduce((total, project) => total + project.notes_count, 0);
  }, [projects]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Filter notes by project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Failed to load projects. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderProjectItem = (project: LearningProject) => (
    <div
      key={project.id}
      className={`flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
        selectedProjectId === project.id ? "bg-muted" : ""
      }`}
      onClick={() => onProjectSelect(project.id)}
    >
      <span className="truncate pr-2" title={project.name}>
        {project.name}
      </span>
      <span className="text-xs bg-muted-foreground/20 px-2 py-1 rounded-full flex-shrink-0">
        {project.notes_count}
      </span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>Filter notes by project</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* All Projects option */}
          <div
            className={`flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
              selectedProjectId === null ? "bg-muted" : ""
            }`}
            onClick={() => onProjectSelect(null)}
          >
            <span className="font-medium">All Projects</span>
            <span className="text-xs bg-muted-foreground/20 px-2 py-1 rounded-full">
              {totalNotesCount}
            </span>
          </div>

          {/* Search Projects */}
          <div className="pt-2 pb-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
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
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
              ))}
            </>
          )}

          {!isLoading && (
            <>
              {/* Search results indicator */}
              {searchQuery.trim() && projects.length > 0 && (
                <div className="text-xs text-muted-foreground pb-2">
                  Found {projects.length} project{projects.length !== 1 ? 's' : ''}
                </div>
              )}

              {/* In Progress Projects */}
              {inProgressProjects.length > 0 && (
                <>
                  <div className="pt-4 pb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">In Progress</h4>
                  </div>
                  {inProgressProjects.map(renderProjectItem)}
                </>
              )}

              {/* Completed Projects */}
              {completedProjects.length > 0 && (
                <>
                  <div className="pt-4 pb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">Completed</h4>
                    {completedProjects.length > maxCompletedToShow && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-xs"
                        onClick={() => setShowAllCompleted(!showAllCompleted)}
                      >
                        {showAllCompleted ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Show All ({completedProjects.length})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                                     {(showAllCompleted ? completedProjects : completedProjects.slice(0, maxCompletedToShow))
                     .map(renderProjectItem)}
                 </>
               )}

               {/* Loading more indicator */}
               {isLoadingMore && (
                 <div className="pt-2">
                   <div className="flex justify-between items-center p-2 opacity-60">
                     <Skeleton className="h-4 w-32" />
                     <Skeleton className="h-5 w-8 rounded-full" />
                   </div>
                 </div>
               )}

                             {/* Empty state */}
               {projects.length === 0 && (
                 <div className="text-sm text-muted-foreground text-center py-4">
                   {searchQuery.trim() ? `No projects found for "${searchQuery}"` : 'No projects found'}
                 </div>
               )}

               {/* Load More button */}
               {hasMore && projects.length > 0 && (
                 <div className="pt-4">
                   <Button
                     variant="outline"
                     size="sm"
                     className="w-full"
                     onClick={loadMore}
                     disabled={isLoadingMore}
                   >
                     {isLoadingMore ? (
                       <>
                         <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                         Loading...
                       </>
                     ) : (
                       'Load More Projects'
                     )}
                   </Button>
                 </div>
               )}
             </>
           )}
         </div>
       </CardContent>
     </Card>
   );
 } 