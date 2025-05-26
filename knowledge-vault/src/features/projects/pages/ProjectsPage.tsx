import { useState } from "react";
import { PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/Tabs";
import { useToast, ToastTitle, ToastDescription } from "@/components/atoms/Toast";
import { NewProjectDialog } from "../components/NewProjectDialog";
import { EditProjectDialog } from "../components/EditProjectDialog";
import { ProjectsList } from "../components/ProjectsList";
import ProjectsLoading from "./ProjectsLoading";
import { useProjects } from "../hooks/internal";
import type { ProjectFormData } from "../types";
import type { LearningProject } from "@/services/api/types/learningProjects";

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
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Projects</h1>
          <p className="text-muted-foreground">Manage your learning journey</p>
        </div>
        <Button onClick={() => setIsNewProjectOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search projects..." 
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as any)} 
          className="ml-auto"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="abandoned">Abandoned</TabsTrigger>
          </TabsList>
        </Tabs>
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