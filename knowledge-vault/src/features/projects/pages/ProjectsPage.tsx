import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { PlusCircle, Search } from "lucide-react"
import { Button } from "@/components/atoms/Button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/atoms/Card"
import { Input } from "@/components/atoms/Input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/Tabs"
import { NewProjectDialog } from "../components/NewProjectDialog"
import type { ProjectFormData } from "../components/NewProjectDialog"

// Mock data - this would come from the API later
const MOCK_PROJECTS = [
  {
    title: "Platzi - FastAPI servers",
    description: "Building RESTful APIs with FastAPI",
    category: "Web Development",
    progress: 65,
    sessions: 12,
    notes: 8,
  },
  {
    title: "Machine Learning Basics",
    description: "Fundamentals of ML algorithms and models",
    category: "Data Science",
    progress: 40,
    sessions: 8,
    notes: 15,
  },
  {
    title: "React Advanced Patterns",
    description: "Component patterns and performance optimization",
    category: "Web Development",
    progress: 90,
    sessions: 20,
    notes: 12,
  },
  {
    title: "Python Data Analysis",
    description: "Data manipulation with Pandas and NumPy",
    category: "Data Science",
    progress: 30,
    sessions: 6,
    notes: 4,
  },
  {
    title: "JavaScript Algorithms",
    description: "Common algorithms and data structures",
    category: "Programming",
    progress: 15,
    sessions: 3,
    notes: 2,
  },
]

export default function ProjectsPage() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Extract unique categories from existing projects
  const existingCategories = useMemo(() => {
    const categories = new Set(MOCK_PROJECTS.map(project => project.category))
    return Array.from(categories)
  }, [])

  const handleCreateProject = (data: ProjectFormData) => {
    // TODO: Implement project creation with API
    console.log("Creating project:", data)
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="ml-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeTab}>
        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_PROJECTS.map((project, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="text-xs font-medium text-muted-foreground mb-1">{project.category}</div>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{project.sessions}</span>
                        <span className="text-muted-foreground ml-1">sessions</span>
                      </div>
                      <div>
                        <span className="font-medium">{project.notes}</span>
                        <span className="text-muted-foreground ml-1">notes</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/projects/${i}`}>View Project</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Active projects would be filtered here */}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Completed projects would be filtered here */}
          </div>
        </TabsContent>
      </Tabs>

      <NewProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        onSubmit={handleCreateProject}
        existingCategories={existingCategories}
      />
    </div>
  )
} 