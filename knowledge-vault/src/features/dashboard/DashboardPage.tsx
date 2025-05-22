import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Clock, FileText, Layers, BookOpen } from "lucide-react";
import { Progress } from "@/components/atoms/Progress";
import { ChartContainer, ChartBars } from "@/components/atoms/Chart";
import SummaryCard from "./components/SummaryCard";
import QuickActions from "./components/QuickActions";

// TODO: Replace with actual data fetching and state management
const chartData = [
  { name: "Mon", value: 0 },
  { name: "Tue", value: 0 },
  { name: "Wed", value: 0 },
  { name: "Thu", value: 0 },
  { name: "Fri", value: 0 },
  { name: "Sat", value: 0 },
  { name: "Sun", value: 0 },
];

const projectProgressData = [
  { name: "Project Alpha", progress: 0, id: "1" },
  { name: "Project Beta", progress: 0, id: "2" },
  { name: "Project Gamma", progress: 0, id: "3" },
];

const recentActivityData = [
  { type: "focus", description: "Completed focus session", project: "Project Alpha", time: "1 hour ago", id: "1" },
  { type: "note", description: "Created new note: \'Initial thoughts\'", project: "Project Beta", time: "2 hours ago", id: "2" },
  { type: "anki", description: "Added 3 new Anki cards", project: "Project Gamma", time: "3 hours ago", id: "3" },
];

// TODO: Replace with actual data for summary cards
const summaryStats = [
    { id: "focusTime", title: "Total Focus Time", value: "0h 0m", icon: Clock, description: "No data yet" },
    { id: "notesCreated", title: "Notes Created", value: "0", icon: FileText, description: "No data yet" },
    { id: "activeProjects", title: "Active Projects", value: "0", icon: Layers, description: "No data yet" },
    { id: "ankiCards", title: "Anki Cards", value: "0", icon: BookOpen, description: "No data yet" },
];

export default function DashboardPage() {
  // TODO: Implement data fetching logic here

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <QuickActions />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
            <SummaryCard 
                key={stat.id}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                description={stat.description}
            />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Focus Time</CardTitle>
            <CardDescription>Your productivity over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="aspect-[4/3]"
              data={chartData} // Using placeholder data
              xField="name"
              yField="value"
            >
              <ChartBars />
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
            <CardDescription>Completion status of your active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectProgressData.length > 0 ? (
                projectProgressData.map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">{project.progress}%</div>
                    </div>
                    <Progress value={project.progress} aria-label={`${project.name} progress`} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No projects to display.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest learning sessions and notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivityData.length > 0 ? (
                recentActivityData.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 rounded-lg border p-3">
                    {activity.type === "focus" && <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />}
                    {activity.type === "note" && <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />}
                    {activity.type === "anki" && <BookOpen className="h-5 w-5 mt-0.5 text-muted-foreground" />}
                    <div>
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Project: {activity.project} • {activity.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity to display.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 