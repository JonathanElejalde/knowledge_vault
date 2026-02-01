import { useState } from "react"
import { PlusCircle } from "lucide-react"
import { PomodoroTimer } from "@/features/pomodoro/components/PomodoroTimer"
import { ProjectSelector } from "@/features/pomodoro/components/ProjectSelector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card"
import { BentoGrid, BentoItem } from "@/components/atoms/BentoGrid"
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
    <div className="container mx-auto p-[var(--layout-page-padding)] max-w-4xl space-y-[var(--layout-section-gap)]">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-heading-2 text-text-primary">Pomodoro Timer</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Focus on your learning with timed sessions
        </p>
      </div>

      {/* Main Timer Card */}
      <Card mood="focus" className="animate-fade-in-up">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
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
        <CardContent className="flex justify-center py-[var(--space-8)]">
          <PomodoroTimer selectedProjectId={selectedProjectId} />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <BentoGrid columns={2} gap="lg">
        {/* Session History */}
        <BentoItem span={1}>
          <Card mood="content" className="h-full animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
              <CardDescription>Your recent Pomodoro sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-[var(--space-3)]">
                {isLoadingSessionSummary ? (
                  <div className="text-center text-text-tertiary py-[var(--space-4)]">
                    Loading sessions...
                  </div>
                ) : !sessionSummary || sessionSummary.length === 0 ? (
                  <div className="text-center text-text-tertiary py-[var(--space-4)]">
                    No Pomodoro sessions yet. Start your first session to see your history here!
                  </div>
                ) : (
                  sessionSummary.map((summary) => (
                    <div 
                      key={summary.project_id || summary.project_name} 
                      className="flex justify-between items-center p-[var(--space-3)] bg-surface-sunken rounded-[var(--radius-md)] transition-colors hover:bg-surface-sunken/80"
                    >
                      <div>
                        <div className="text-label text-text-primary">
                          {summary.project_name}
                        </div>
                        <div className="text-caption text-text-tertiary">
                          {formatSessionDateRange(summary.first_session_date, summary.last_session_date)}
                        </div>
                      </div>
                      <div className="text-label text-mood-focus-accent font-medium">
                        {formatDuration(summary.total_duration_minutes)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </BentoItem>

        {/* Statistics */}
        <BentoItem span={1}>
          <Card mood="insight" className="h-full animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Your focus time this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-[var(--space-4)]">
                {isLoadingWeeklyStats ? (
                  <div className="text-center text-text-tertiary py-[var(--space-4)]">
                    Loading statistics...
                  </div>
                ) : weeklyStatsError ? (
                  <div className="text-center text-text-tertiary py-[var(--space-4)]">
                    <p>Unable to load statistics</p>
                    <p className="text-caption mt-1">Using default values</p>
                  </div>
                ) : (
                  <>
                    <StatRow 
                      label="Total focus time" 
                      value={formatDuration(weeklyStats?.total_focus_time_minutes || 0)} 
                    />
                    <StatRow 
                      label="Completed sessions" 
                      value={weeklyStats?.completed_sessions_count?.toString() || "0"} 
                    />
                    <StatRow 
                      label="Abandoned sessions" 
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
        </BentoItem>
      </BentoGrid>

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
    <div className="flex justify-between items-center">
      <span className="text-body-sm text-text-secondary">{label}</span>
      <span className="text-label text-text-primary font-medium">{value}</span>
    </div>
  );
}
