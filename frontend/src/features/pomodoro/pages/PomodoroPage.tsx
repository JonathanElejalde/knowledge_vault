import { useState } from "react"
import { PlusCircle } from "lucide-react"
import { PomodoroTimer } from "@/features/pomodoro/components/PomodoroTimer"
import { ProjectSelector } from "@/features/pomodoro/components/ProjectSelector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card"
import { Button } from "@/components/atoms/Button"
import { usePomodoro, usePomodoroSummary, usePomodoroWeeklyStats } from "@/features/pomodoro/hooks/internal"
import { NewProjectDialog } from "@/features/projects/components/NewProjectDialog"
import type { ProjectFormData } from "@/features/projects/components/NewProjectDialog"
import { learningProjectsApi } from "@/services/api/learningProjects"
import { useToast, ToastTitle, ToastDescription } from "@/components/atoms/Toast"
import { formatSessionDateRange } from "@/lib/utils/dateUtils"

// Utility for formatting time duration
function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${remainingMinutes}m`;
}

export default function PomodoroPage() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const { toast } = useToast()

  // Only usePomodoro for timer and preferences
  const {
    selectedProjectId,
    setSelectedProjectId,
  } = usePomodoro()

  // Use the new summary hook for session history
  const { summary: sessionSummary, isLoading: isLoadingSessionSummary } = usePomodoroSummary()

  // Use the weekly statistics hook
  const { weeklyStats, isLoading: isLoadingWeeklyStats, error: weeklyStatsError } = usePomodoroWeeklyStats()

  const handleCreateProject = async (data: ProjectFormData) => {
    try {
      const newProject = await learningProjectsApi.create({
        name: data.name,
        category_name: data.category_name,
        description: data.description,
        status: "in_progress",
      })
      setIsNewProjectOpen(false)
      setSelectedProjectId(newProject.id)
      toast({
        children: (
          <>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Project created successfully</ToastDescription>
          </>
        ),
      })
    } catch (error) {
      console.error('Failed to create project:', error);
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
              {isLoadingSessionSummary ? (
                <div className="text-center text-muted-foreground">Loading sessions...</div>
              ) : !sessionSummary || sessionSummary.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No Pomodoro sessions yet. Start your first session to see your history here!
                </div>
              ) : (
                sessionSummary.map((summary) => (
                  <div 
                    key={summary.project_id || summary.project_name} 
                    className="flex justify-between items-center p-3 bg-muted/50 rounded-md"
                  >
                    <div>
                      <div className="font-medium">
                        {summary.project_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatSessionDateRange(summary.first_session_date, summary.last_session_date)}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatDuration(summary.total_duration_minutes)}
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
            <div className="space-y-4">
              {isLoadingWeeklyStats ? (
                <div className="text-center text-muted-foreground">Loading statistics...</div>
              ) : weeklyStatsError ? (
                <div className="text-center text-muted-foreground">
                  <p>Unable to load statistics</p>
                  <p className="text-xs mt-1">Using default values (API endpoint may not be available yet)</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Total focus time</span>
                    <span className="font-medium">
                      {formatDuration(weeklyStats?.total_focus_time_minutes || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Completed sessions</span>
                    <span className="font-medium">
                      {weeklyStats?.completed_sessions_count || 0}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Abandoned sessions</span>
                    <span className="font-medium">
                      {weeklyStats?.abandoned_sessions_count || 0}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Notes taken</span>
                    <span className="font-medium">
                      {weeklyStats?.notes_count || 0}
                    </span>
                  </div>
                </>
              )}
            </div>
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