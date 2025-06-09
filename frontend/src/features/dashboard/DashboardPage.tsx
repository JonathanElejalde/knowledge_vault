import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Clock, FileText, Layers, CheckCircle } from "lucide-react";
import SummaryCard from "./components/SummaryCard";
import QuickActions from "./components/QuickActions";
import PeriodSelector from "./components/PeriodSelector";
import DailyActivityChart from "./components/DailyActivityChart";
import ProjectStatsChart from "./components/ProjectStatsChart";
import SessionTimelineChart from "./components/SessionTimelineChart";
import { ChartLoadingSkeleton, SummaryCardSkeleton } from "./components/LoadingSkeleton";
import { useDashboard } from "./hooks/useDashboard";
import { formatFocusTime } from "./utils/formatters";

export default function DashboardPage() {
  const {
    stats,
    projectStats,
    dailyActivity,
    sessionTimes,
    selectedPeriod,
    isLoading,
    error,
    setPeriod,
  } = useDashboard();

  // Summary stats configuration
  const summaryStats = [
    { 
      id: "focusTime", 
      title: "Total Focus Time", 
      value: stats ? formatFocusTime(stats.total_focus_time) : "0m", 
      icon: Clock, 
      description: `${selectedPeriod === '7d' ? 'Last 7 days' : selectedPeriod === '2w' ? 'Last 2 weeks' : selectedPeriod === '4w' ? 'Last 4 weeks' : selectedPeriod === '3m' ? 'Last 3 months' : selectedPeriod === '1y' ? 'Last year' : 'All time'}` 
    },
    { 
      id: "notesCreated", 
      title: "Notes Created", 
      value: stats ? stats.notes_created.toString() : "0", 
      icon: FileText, 
      description: `${selectedPeriod === '7d' ? 'Last 7 days' : selectedPeriod === '2w' ? 'Last 2 weeks' : selectedPeriod === '4w' ? 'Last 4 weeks' : selectedPeriod === '3m' ? 'Last 3 months' : selectedPeriod === '1y' ? 'Last year' : 'All time'}` 
    },
    { 
      id: "activeProjects", 
      title: "Active Projects", 
      value: stats ? stats.active_projects.toString() : "0", 
      icon: Layers, 
      description: "Currently in progress" 
    },
    { 
      id: "completedProjects", 
      title: "Completed Projects", 
      value: stats ? stats.completed_projects.toString() : "0", 
      icon: CheckCircle, 
      description: "Successfully finished" 
    },
  ];

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Failed to load dashboard data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <PeriodSelector 
            selectedPeriod={selectedPeriod}
            onPeriodChange={setPeriod}
            className="w-full sm:w-auto"
          />
          <QuickActions />
        </div>
      </div>

      {/* Summary cards: always 4 in a row on xl+ screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <div className="w-full" key={stat.id}>
            {isLoading ? (
              <SummaryCardSkeleton />
            ) : (
              <SummaryCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                description={stat.description}
              />
            )}
          </div>
        ))}
      </div>

      {/* Main content: 2 columns, Session Timeline spans both */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>Sessions and notes created by date</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoadingSkeleton className="h-64" />
            ) : (
              <DailyActivityChart 
                data={dailyActivity} 
                className="h-64"
              />
            )}
          </CardContent>
        </Card>

        {/* Project Statistics Chart */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Project Activity</CardTitle>
            <CardDescription>Sessions and notes by project</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoadingSkeleton className="h-64" />
            ) : (
              <ProjectStatsChart 
                data={projectStats} 
                className="h-64"
              />
            )}
          </CardContent>
        </Card>

        {/* Session Timeline: spans both columns on large screens */}
        <Card className="w-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Session Timeline</CardTitle>
            <CardDescription>When you work throughout the day, colored by project</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoadingSkeleton className="h-80" />
            ) : (
              <SessionTimelineChart 
                data={sessionTimes} 
                className="h-80"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 