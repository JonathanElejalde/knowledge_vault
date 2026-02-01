import { useState } from "react"
import { FolderPlus } from "lucide-react"
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
import { cn } from "@/lib/utils"

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
    <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        {/* Title & Description */}
        <div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">
            Pomodoro Timer
          </h2>
          <p className="mt-2 text-text-tertiary text-sm max-w-xl">
            Focus on your learning with timed deep work sessions.
          </p>
        </div>
        
        {/* Actions */}
        <Button 
          variant="outline" 
          onClick={() => setIsNewProjectOpen(true)}
          className="gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Main Content - 3 column layout on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Session History */}
        <Card className="flex flex-col lg:order-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Session History</CardTitle>
            <CardDescription className="text-xs">Your recent sessions</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-2">
              {isLoadingSessionSummary ? (
                <div className="text-center text-text-tertiary py-8 text-sm">
                  Loading...
                </div>
              ) : !sessionSummary || sessionSummary.length === 0 ? (
                <div className={cn(
                  "flex items-center justify-center py-12",
                  "bg-surface-sunken/50 rounded-lg border border-dashed border-border-subtle"
                )}>
                  <p className="text-sm text-text-tertiary text-center px-4">
                    No sessions yet. Start your first Pomodoro!
                  </p>
                </div>
              ) : (
                sessionSummary.slice(0, 5).map((summary) => (
                  <div 
                    key={summary.project_id || summary.project_name} 
                    className={cn(
                      "flex justify-between items-center p-3",
                      "bg-surface-sunken rounded-lg",
                      "transition-colors hover:bg-surface-sunken/80"
                    )}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {summary.project_name}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {formatSessionDateRange(summary.first_session_date, summary.last_session_date)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-accent-primary whitespace-nowrap">
                      {formatDuration(summary.total_duration_minutes)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Center: Timer (takes center stage) */}
        <Card className="lg:order-2">
          <CardHeader className="pb-0">
            {/* Project Selector - prominent placement */}
            <div className="flex flex-col items-center gap-3">
              <ProjectSelector 
                value={selectedProjectId} 
                onValueChange={setSelectedProjectId} 
              />
              {!selectedProjectId && (
                <p className="text-xs text-text-muted">
                  Select a project to start focusing
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex justify-center pt-4 pb-8">
            <PomodoroTimer selectedProjectId={selectedProjectId} />
          </CardContent>
        </Card>

        {/* Right: Statistics */}
        <Card className="flex flex-col lg:order-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">This Week</CardTitle>
            <CardDescription className="text-xs">Your focus statistics</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              {isLoadingWeeklyStats ? (
                <div className="text-center text-text-tertiary py-8 text-sm">
                  Loading...
                </div>
              ) : weeklyStatsError ? (
                <div className={cn(
                  "flex flex-col items-center justify-center py-12",
                  "bg-surface-sunken/50 rounded-lg border border-dashed border-border-subtle"
                )}>
                  <p className="text-sm text-text-tertiary">Unable to load</p>
                </div>
              ) : (
                <>
                  {/* Hero stat */}
                  <div className="p-4 bg-accent-primary-subtle rounded-lg text-center mb-4">
                    <div className="text-2xl font-bold text-accent-primary">
                      {formatDuration(weeklyStats?.total_focus_time_minutes || 0)}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">Total focus time</div>
                  </div>
                  
                  <StatRow 
                    label="Completed" 
                    value={weeklyStats?.completed_sessions_count?.toString() || "0"} 
                  />
                  <StatRow 
                    label="Abandoned" 
                    value={weeklyStats?.abandoned_sessions_count?.toString() || "0"} 
                  />
                  <StatRow 
                    label="Notes taken" 
                    value={weeklyStats?.notes_count?.toString() || "0"} 
                  />
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

// Helper component for stat rows
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border-subtle last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}
