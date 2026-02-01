import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card";
import { BentoGrid, BentoItem } from "@/components/atoms/BentoGrid";
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

  // Summary stats configuration with mood assignments
  const summaryStats = [
    { 
      id: "focusTime", 
      title: "Total Focus Time", 
      value: stats ? formatFocusTime(stats.total_focus_time) : "0m", 
      icon: Clock, 
      description: `${selectedPeriod === '7d' ? 'Last 7 days' : selectedPeriod === '2w' ? 'Last 2 weeks' : selectedPeriod === '4w' ? 'Last 4 weeks' : selectedPeriod === '3m' ? 'Last 3 months' : selectedPeriod === '1y' ? 'Last year' : 'All time'}`,
      mood: 'focus' as const,
    },
    { 
      id: "notesCreated", 
      title: "Notes Created", 
      value: stats ? stats.notes_created.toString() : "0", 
      icon: FileText, 
      description: `${selectedPeriod === '7d' ? 'Last 7 days' : selectedPeriod === '2w' ? 'Last 2 weeks' : selectedPeriod === '4w' ? 'Last 4 weeks' : selectedPeriod === '3m' ? 'Last 3 months' : selectedPeriod === '1y' ? 'Last year' : 'All time'}`,
      mood: 'insight' as const,
    },
    { 
      id: "activeProjects", 
      title: "Active Projects", 
      value: stats ? stats.active_projects.toString() : "0", 
      icon: Layers, 
      description: "Currently in progress",
      mood: 'growth' as const,
    },
    { 
      id: "completedProjects", 
      title: "Completed Projects", 
      value: stats ? stats.completed_projects.toString() : "0", 
      icon: CheckCircle, 
      description: "Successfully finished",
      mood: 'growth' as const,
    },
  ];

  if (error) {
    return (
      <div className="container mx-auto p-[var(--layout-page-padding)] max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-danger mb-2">Failed to load dashboard data</p>
            <p className="text-body-sm text-text-tertiary">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-[var(--layout-page-padding)] max-w-6xl space-y-[var(--layout-section-gap)]">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-heading-2 text-text-primary">Dashboard</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Track your learning progress and focus time
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <PeriodSelector 
            selectedPeriod={selectedPeriod}
            onPeriodChange={setPeriod}
            className="w-full sm:w-auto"
          />
          <QuickActions />
        </div>
      </div>

      {/* Summary cards in Bento Grid */}
      <BentoGrid columns={4} gap="md">
        {summaryStats.map((stat, index) => (
          <BentoItem key={stat.id}>
            {isLoading ? (
              <SummaryCardSkeleton />
            ) : (
              <SummaryCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                description={stat.description}
                mood={stat.mood}
                style={{ animationDelay: `${index * 50}ms` }}
              />
            )}
          </BentoItem>
        ))}
      </BentoGrid>

      {/* Charts in Bento Grid */}
      <BentoGrid columns={2} gap="lg">
        {/* Daily Activity Chart */}
        <BentoItem span={1}>
          <Card mood="insight" className="h-full">
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
        </BentoItem>

        {/* Project Statistics Chart */}
        <BentoItem span={1}>
          <Card mood="growth" className="h-full">
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
        </BentoItem>

        {/* Session Timeline: spans both columns */}
        <BentoItem span={2} height="tall">
          <Card mood="focus" className="h-full">
            <CardHeader>
              <CardTitle>Session Timeline</CardTitle>
              <CardDescription>When you work throughout the day, colored by project</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartLoadingSkeleton className="h-72" />
              ) : (
                <SessionTimelineChart 
                  data={sessionTimes} 
                  className="h-72"
                />
              )}
            </CardContent>
          </Card>
        </BentoItem>
      </BentoGrid>
    </div>
  );
}
