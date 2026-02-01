import { useState } from "react";
import { FolderPlus, Search } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useToast, ToastTitle, ToastDescription } from "@/components/atoms/Toast";
import { NewProjectDialog } from "../components/NewProjectDialog";
import { EditProjectDialog } from "../components/EditProjectDialog";
import { ProjectsList } from "../components/ProjectsList";
import { StatusTabs } from "../components/StatusTabs";
import ProjectsLoading from "./ProjectsLoading";
import { useProjects } from "../hooks/internal";
import type { ProjectFormData } from "../types";
import type { LearningProject } from "@/services/api/types/learningProjects";

/**
 * ProjectsPage - Deep Focus Design
 * 
 * Layout structure:
 * 1. Header: Title + description (left) | New Project action (right)
 * 2. Filters: Search input + Status tabs
 * 3. Projects grid with infinite scroll
 */
export default function ProjectsPage() {
  // UI state
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<LearningProject | null>(null);
  
  // Toast for notifications
  const { toast } = useToast();
  
  // Projects data and actions from hook
  const {
    projects,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    searchQuery,
    activeTab,
    setSearchQuery,
    setActiveTab,
    loadMore,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects();

  // Handle project creation
  const handleCreateProject = async (data: ProjectFormData) => {
    try {
      await createProject({
        name: data.name,
        category_name: data.category_name || undefined,
        description: data.description,
        status: "in_progress",
      });
      setIsNewProjectOpen(false);
      toast({
        children: (
          <>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Project created successfully</ToastDescription>
          </>
        ),
      });
    } catch (err) {
      toast({
        children: (
          <>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Failed to create project. Please try again.</ToastDescription>
          </>
        ),
        variant: "destructive",
      });
    }
  };

  // Handle project editing
  const handleEditProject = async (data: ProjectFormData) => {
    if (!selectedProject) return;

    try {
      await updateProject(selectedProject.id, {
        name: data.name,
        category_name: data.category_name || undefined,
        description: data.description,
      });
      setIsEditProjectOpen(false);
      setSelectedProject(null);
      toast({
        children: (
          <>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Project updated successfully</ToastDescription>
          </>
        ),
      });
    } catch (err) {
      toast({
        children: (
          <>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Failed to update project. Please try again.</ToastDescription>
          </>
        ),
        variant: "destructive",
      });
    }
  };

  // Handle status change
  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      await updateProject(projectId, { status: newStatus as any });
      toast({
        children: (
          <>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Project status updated successfully</ToastDescription>
          </>
        ),
      });
    } catch (err) {
      toast({
        children: (
          <>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Failed to update project status</ToastDescription>
          </>
        ),
        variant: "destructive",
      });
    }
  };

  // Handle project deletion
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      toast({
        children: (
          <>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Project deleted successfully</ToastDescription>
          </>
        ),
      });
    } catch (err) {
      toast({
        children: (
          <>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Failed to delete project</ToastDescription>
          </>
        ),
        variant: "destructive",
      });
    }
  };

  // Handle edit dialog opening
  const handleEditClick = (project: LearningProject) => {
    setSelectedProject(project);
    setIsEditProjectOpen(true);
  };

  // Loading state
  if (isLoading) {
    return <ProjectsLoading />;
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-semantic-danger mb-2">Failed to load projects</p>
            <p className="text-sm text-text-tertiary mb-4">{error.message}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        {/* Title & Description */}
        <div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">
            Learning Projects
          </h2>
          <p className="mt-2 text-text-tertiary text-sm max-w-xl">
            Organize your learning journey into focused projects. Track progress, take notes, and build knowledge systematically.
          </p>
        </div>
        
        {/* Actions */}
        <Button 
          onClick={() => setIsNewProjectOpen(true)}
          className="gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input 
            type="search" 
            placeholder="Search projects..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Status Tabs */}
        <StatusTabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
        />
      </div>

      {/* Projects List */}
      <ProjectsList
        projects={projects}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onEdit={handleEditClick}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteProject}
        onCreateNew={() => setIsNewProjectOpen(true)}
      />

      {/* Dialogs */}
      <NewProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        onSubmit={handleCreateProject}
      />

      {selectedProject && (
        <EditProjectDialog
          open={isEditProjectOpen}
          onOpenChange={setIsEditProjectOpen}
          onSubmit={handleEditProject}
          project={selectedProject}
        />
      )}
    </div>
  );
}
