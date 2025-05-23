import { useState, useMemo, useEffect } from "react"
import { Link } from "react-router-dom"
import { PlusCircle, Search, MoreVertical, Edit, Archive, CheckCircle, XCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/atoms/Button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/atoms/Card"
import { Input } from "@/components/atoms/Input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/Tabs"
import { NewProjectDialog } from "../components/NewProjectDialog"
import { EditProjectDialog } from "../components/EditProjectDialog"
import type { ProjectFormData } from "../components/NewProjectDialog"
import { learningProjectsApi } from "@/services/api/learningProjects"
import type { LearningProject } from "@/services/api/types/learningProjects"
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/atoms/Toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/atoms/DropdownMenu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/Select"
import ProjectsLoading from "./ProjectsLoading"

type TabValue = "all" | "in_progress" | "completed" | "abandoned"

// Function to format status for display
const formatStatus = (status: string): string => {
  switch (status) {
    case 'in_progress':
      return 'In Progress'
    case 'completed':
      return 'Completed'
    case 'abandoned':
      return 'Abandoned'
    default:
      return status
  }
}

export default function ProjectsPage() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<LearningProject | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TabValue>("all")
  const [projects, setProjects] = useState<LearningProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Extract unique categories from existing projects
  const existingCategories = useMemo(() => {
    const categories = new Set(projects.map(project => project.category))
    return Array.from(categories)
  }, [projects])

  // Fetch projects on mount and when filters change
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const filters = {
          status: activeTab === "all" ? undefined : activeTab,
          search: searchQuery || undefined,
        }
        const data = await learningProjectsApi.list(filters)
        setProjects(data)
      } catch (err: any) {
        const errorMessage = err.response?.status === 401
          ? "Please log in to view your projects"
          : "Failed to load projects"
        setError(errorMessage)
        toast({
          children: (
            <>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                {err.response?.status === 401
                  ? "Please log in to view your projects"
                  : "Failed to load projects. Please try again."}
              </ToastDescription>
            </>
          ),
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [activeTab, searchQuery, toast])

  const handleCreateProject = async (data: ProjectFormData) => {
    try {
      const newProject = await learningProjectsApi.create({
        name: data.name,
        category: data.category,
        description: data.description,
        status: "in_progress",
      })
      setProjects(prev => [...prev, newProject])
      setIsNewProjectOpen(false)
      toast({
        children: (
          <>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Project created successfully</ToastDescription>
          </>
        ),
      })
    } catch (err) {
      toast({
        children: (
          <>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Failed to create project. Please try again.</ToastDescription>
          </>
        ),
        variant: "destructive",
      })
    }
  }

  const handleEditProject = async (data: ProjectFormData) => {
    if (!selectedProject) return

    try {
      const updatedProject = await learningProjectsApi.update(selectedProject.id, {
        name: data.name,
        category: data.category,
        description: data.description,
      })
      setProjects(prev => prev.map(p => 
        p.id === selectedProject.id ? updatedProject : p
      ))
      setIsEditProjectOpen(false)
      setSelectedProject(null)
      toast({
        children: (
          <>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Project updated successfully</ToastDescription>
          </>
        ),
      })
    } catch (err) {
      toast({
        children: (
          <>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Failed to update project. Please try again.</ToastDescription>
          </>
        ),
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      await learningProjectsApi.update(projectId, { status: newStatus as any })
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, status: newStatus as any } : p
      ))
      toast({
        children: (
          <>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Project status updated successfully</ToastDescription>
          </>
        ),
      })
    } catch (err) {
      toast({
        children: (
          <>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Failed to update project status</ToastDescription>
          </>
        ),
        variant: "destructive",
      })
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      await learningProjectsApi.delete(projectId)
      setProjects(prev => prev.filter(p => p.id !== projectId))
      toast({
        children: (
          <>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Project deleted successfully</ToastDescription>
          </>
        ),
      })
    } catch (err) {
      toast({
        children: (
          <>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Failed to delete project</ToastDescription>
          </>
        ),
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <ProjectsLoading />
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="ml-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="abandoned">Abandoned</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeTab}>
        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col h-full">
                <div className="flex-1 flex flex-col">
                  <CardHeader className="p-0 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1">{project.category}</div>
                        <CardTitle className="text-2xl font-bold leading-tight mb-1">{project.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-base text-muted-foreground mb-2">{project.description}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedProject(project)
                            setIsEditProjectOpen(true)
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>
                          {project.status === 'in_progress' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'completed')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'abandoned')}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Mark as Abandoned
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col justify-end">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-bold text-base mb-2">
                        <div className={`h-2 w-2 rounded-full mt-0.5 ${
                          project.status === 'in_progress' ? 'bg-blue-500' :
                          project.status === 'completed' ? 'bg-green-500' :
                          'bg-red-500'
                        }`} />
                        <span>{formatStatus(project.status)}</span>
                      </div>
                      <div className="flex justify-between text-base pt-2 border-t">
                        <div>
                          <span className="font-medium">0</span>
                          <span className="text-muted-foreground ml-1">sessions</span>
                        </div>
                        <div>
                          <span className="font-medium">0</span>
                          <span className="text-muted-foreground ml-1">notes</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
                <CardFooter className="p-0 pt-4">
                  <Button variant="outline" className="w-full font-bold text-base py-2 border-2 border-gray-200" asChild>
                    <Link to={`/projects/${project.id}`}>View Project</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="in_progress" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col h-full">
                <div className="flex-1 flex flex-col">
                  <CardHeader className="p-0 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1">{project.category}</div>
                        <CardTitle className="text-2xl font-bold leading-tight mb-1">{project.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-base text-muted-foreground mb-2">{project.description}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedProject(project)
                            setIsEditProjectOpen(true)
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>
                          {project.status === 'in_progress' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'completed')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'abandoned')}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Mark as Abandoned
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col justify-end">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-bold text-base mb-2">
                        <div className={`h-2 w-2 rounded-full mt-0.5 ${
                          project.status === 'in_progress' ? 'bg-blue-500' :
                          project.status === 'completed' ? 'bg-green-500' :
                          'bg-red-500'
                        }`} />
                        <span>{formatStatus(project.status)}</span>
                      </div>
                      <div className="flex justify-between text-base pt-2 border-t">
                        <div>
                          <span className="font-medium">0</span>
                          <span className="text-muted-foreground ml-1">sessions</span>
                        </div>
                        <div>
                          <span className="font-medium">0</span>
                          <span className="text-muted-foreground ml-1">notes</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
                <CardFooter className="p-0 pt-4">
                  <Button variant="outline" className="w-full font-bold text-base py-2 border-2 border-gray-200" asChild>
                    <Link to={`/projects/${project.id}`}>View Project</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col h-full">
                <div className="flex-1 flex flex-col">
                  <CardHeader className="p-0 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1">{project.category}</div>
                        <CardTitle className="text-2xl font-bold leading-tight mb-1">{project.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-base text-muted-foreground mb-2">{project.description}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedProject(project)
                            setIsEditProjectOpen(true)
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>
                          {project.status === 'in_progress' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'completed')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'abandoned')}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Mark as Abandoned
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col justify-end">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-bold text-base mb-2">
                        <div className={`h-2 w-2 rounded-full mt-0.5 ${
                          project.status === 'in_progress' ? 'bg-blue-500' :
                          project.status === 'completed' ? 'bg-green-500' :
                          'bg-red-500'
                        }`} />
                        <span>{formatStatus(project.status)}</span>
                      </div>
                      <div className="flex justify-between text-base pt-2 border-t">
                        <div>
                          <span className="font-medium">0</span>
                          <span className="text-muted-foreground ml-1">sessions</span>
                        </div>
                        <div>
                          <span className="font-medium">0</span>
                          <span className="text-muted-foreground ml-1">notes</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
                <CardFooter className="p-0 pt-4">
                  <Button variant="outline" className="w-full font-bold text-base py-2 border-2 border-gray-200" asChild>
                    <Link to={`/projects/${project.id}`}>View Project</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="abandoned" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col h-full">
                <div className="flex-1 flex flex-col">
                  <CardHeader className="p-0 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1">{project.category}</div>
                        <CardTitle className="text-2xl font-bold leading-tight mb-1">{project.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-base text-muted-foreground mb-2">{project.description}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedProject(project)
                            setIsEditProjectOpen(true)
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>
                          {project.status === 'in_progress' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'completed')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'abandoned')}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Mark as Abandoned
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col justify-end">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-bold text-base mb-2">
                        <div className={`h-2 w-2 rounded-full mt-0.5 ${
                          project.status === 'in_progress' ? 'bg-blue-500' :
                          project.status === 'completed' ? 'bg-green-500' :
                          'bg-red-500'
                        }`} />
                        <span>{formatStatus(project.status)}</span>
                      </div>
                      <div className="flex justify-between text-base pt-2 border-t">
                        <div>
                          <span className="font-medium">0</span>
                          <span className="text-muted-foreground ml-1">sessions</span>
                        </div>
                        <div>
                          <span className="font-medium">0</span>
                          <span className="text-muted-foreground ml-1">notes</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
                <CardFooter className="p-0 pt-4">
                  <Button variant="outline" className="w-full font-bold text-base py-2 border-2 border-gray-200" asChild>
                    <Link to={`/projects/${project.id}`}>View Project</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <NewProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        onSubmit={handleCreateProject}
        existingCategories={existingCategories}
      />

      {selectedProject && (
        <EditProjectDialog
          open={isEditProjectOpen}
          onOpenChange={setIsEditProjectOpen}
          onSubmit={handleEditProject}
          project={selectedProject}
          existingCategories={existingCategories}
        />
      )}
    </div>
  )
} 