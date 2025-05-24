import { useState, useEffect } from "react"
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
import { pomodoroApi } from "@/services/api/pomodoro"
import type { PomodoroSessionSummary } from "@/services/api/types/pomodoro"

// Utility for formatting session date or range
function formatSessionDateRange(first: string, last: string) {
  const firstDate = new Date(first)
  const lastDate = new Date(last)
  const isSameDay =
    firstDate.getFullYear() === lastDate.getFullYear() &&
    firstDate.getMonth() === lastDate.getMonth() &&
    firstDate.getDate() === lastDate.getDate()
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  function isToday(date: Date) {
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }
  function isYesterday(date: Date) {
    return (
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()
    )
  }
  function formatDate(date: Date) {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }
  if (isSameDay) {
    if (isToday(firstDate)) return 'Today'
    if (isYesterday(firstDate)) return 'Yesterday'
    return formatDate(firstDate)
  } else {
    const firstLabel = isToday(firstDate)
      ? 'Today'
      : isYesterday(firstDate)
      ? 'Yesterday'
      : formatDate(firstDate)
    const lastLabel = isToday(lastDate)
      ? 'Today'
      : isYesterday(lastDate)
      ? 'Yesterday'
      : formatDate(lastDate)
    return `${firstLabel} – ${lastLabel}`
  }
}

export default function PomodoroPage() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const { toast } = useToast()
  const {
    selectedProjectId,
    setSelectedProjectId,
    statistics,
    isLoadingStatistics,
    refreshProjects
  } = usePomodoro()

  // New: Session summary state
  const [sessionSummaries, setSessionSummaries] = useState<PomodoroSessionSummary[]>([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)

  useEffect(() => {
    let mounted = true
    setIsLoadingSummary(true)
    pomodoroApi.getSessionSummary({ period: 'week', limit: 10 })
      .then((data) => {
        if (mounted) setSessionSummaries(data)
      })
      .catch(() => {
        if (mounted) setSessionSummaries([])
      })
      .finally(() => {
        if (mounted) setIsLoadingSummary(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleCreateProject = async (data: ProjectFormData) => {
    try {
      const newProject = await learningProjectsApi.create({
        name: data.name,
        category_name: data.category_name,
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
              {isLoadingSummary ? (
                <div className="text-center text-muted-foreground">Loading sessions...</div>
              ) : sessionSummaries.length === 0 ? (
                <div className="text-center text-muted-foreground">No Pomodoro sessions yet. Start your first session to see your history here!</div>
              ) : (
                sessionSummaries.map((summary) => (
                  <div key={summary.project_id || summary.project_name} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                    <div>
                      <div className="font-medium">
                        {summary.project_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatSessionDateRange(summary.first_session_date, summary.last_session_date)}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {Math.floor(summary.total_duration_minutes / 60) > 0
                        ? `${Math.floor(summary.total_duration_minutes / 60)}h `
                        : ''}
                      {summary.total_duration_minutes % 60}m
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