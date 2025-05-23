import { PomodoroTimer } from "@/features/pomodoro/components/PomodoroTimer"
import { ProjectSelector } from "@/features/pomodoro/components/ProjectSelector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card"

export default function PomodoroPage() {
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
          <ProjectSelector />
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <PomodoroTimer />
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
              {[
                { date: "Today", project: "Platzi - FastAPI servers", duration: "1h 25m" },
                { date: "Yesterday", project: "Machine Learning Basics", duration: "2h 15m" },
                { date: "May 20, 2025", project: "React Advanced Patterns", duration: "45m" },
              ].map((session, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                  <div>
                    <div className="font-medium">{session.project}</div>
                    <div className="text-sm text-muted-foreground">{session.date}</div>
                  </div>
                  <div className="text-sm">{session.duration}</div>
                </div>
              ))}
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total focus time</span>
                  <span className="font-medium">8h 45m</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[70%]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completed sessions</span>
                  <span className="font-medium">24 / 28</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[85%]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Weekly goal</span>
                  <span className="font-medium">10h / 15h</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[66%]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 