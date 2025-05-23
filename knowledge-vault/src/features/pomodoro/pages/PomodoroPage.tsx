import { useState } from "react"
import { PlusCircle } from "lucide-react"
import { PomodoroTimer } from "@/features/pomodoro/components/PomodoroTimer"
import { ProjectSelector } from "@/features/pomodoro/components/ProjectSelector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card"
import { Button } from "@/components/atoms/Button"
import { usePomodoro } from "@/features/pomodoro/hooks/usePomodoro"
import { NewProjectDialog } from "@/features/projects/components/NewProjectDialog"
import type { ProjectFormData } from "@/features/projects/components/NewProjectDialog"
import { learningProjectsApi } from "@/services/api/learningProjects"
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/atoms/Toast"

export default function PomodoroPage() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const { toast } = useToast()
  const { 
    selectedProjectId, 
    setSelectedProjectId, 
    sessions, 
    isLoadingSessions, 
    statistics, 
    isLoadingStatistics,
    refreshProjects
  } = usePomodoro()

  const handleCreateProject = async (data: ProjectFormData) => {
    try {
      const newProject = await learningProjectsApi.create({
        name: data.name,
        category: data.category,
        description: data.description,
        status: "in_progress",
      })
      setIsNewProjectOpen(false)
      refreshProjects()
      setSelectedProjectId(newProject.id)
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Pomodoro Timer</h1>
        <p className="text-muted-foreground">Focus on your learning with timed sessions</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current Session</CardTitle>
            <CardDescription>Select a project and start your timer</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsNewProjectOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Project
            </Button>
            <ProjectSelector 
              value={selectedProjectId} 
              onValueChange={setSelectedProjectId} 
            />
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <PomodoroTimer selectedProjectId={selectedProjectId} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>Your recent Pomodoro sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingSessions ? (
                <div className="text-center text-muted-foreground">Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center text-muted-foreground">No sessions yet. Start your first Pomodoro!</div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                    <div>
                      <div className="font-medium">
                        {session.learning_project?.name || 'No Project'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm">
                      {session.actual_duration ? `${session.actual_duration}m` : `${session.work_duration}m`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
            <CardDescription>Your focus time this week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStatistics ? (
              <div className="text-center text-muted-foreground">Loading statistics...</div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total focus time</span>
                    <span className="font-medium">
                      {Math.floor(statistics.total_focus_time / 60)}h {statistics.total_focus_time % 60}m
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300" 
                      style={{ 
                        width: `${Math.min((statistics.weekly_progress / statistics.weekly_goal) * 100, 100)}%` 
                      }} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed sessions</span>
                    <span className="font-medium">
                      {statistics.completed_sessions} / {statistics.total_sessions}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300" 
                      style={{ 
                        width: `${statistics.total_sessions > 0 ? (statistics.completed_sessions / statistics.total_sessions) * 100 : 0}%` 
                      }} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Weekly goal</span>
                    <span className="font-medium">
                      {Math.floor(statistics.weekly_progress / 60)}h {statistics.weekly_progress % 60}m / {Math.floor(statistics.weekly_goal / 60)}h
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300" 
                      style={{ 
                        width: `${Math.min((statistics.weekly_progress / statistics.weekly_goal) * 100, 100)}%` 
                      }} 
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        onSubmit={handleCreateProject}
      />
    </div>
  )
} 