import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card";
import { BentoGrid, BentoItem } from "@/components/atoms/BentoGrid";
import { Clock, FileText, Layers } from "lucide-react";
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

  // Helper to get period label
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '7d': return 'Last 7 days';
      case '2w': return 'Last 2 weeks';
      case '4w': return 'Last 4 weeks';
      case '3m': return 'Last 3 months';
      case '1y': return 'Last year';
      default: return 'All time';
    }
  };

  // Summary stats configuration with mood and variant assignments
  // Layout: Hero (2 cols) + Notes (1 col) + Active Projects (1 col) = 4 columns
  const summaryStats = [
    { 
      id: "focusTime", 
      title: "Total Focus Time", 
      value: stats ? formatFocusTime(stats.total_focus_time) : "0m", 
      icon: Clock, 
      description: getPeriodLabel(),
      mood: 'focus' as const,
      variant: 'hero' as const,
      span: 2 as const,
    },
    { 
      id: "notesCreated", 
      title: "Notes Created", 
      value: stats ? stats.notes_created.toString() : "0", 
      icon: FileText, 
      description: getPeriodLabel(),
      mood: 'insight' as const,
      variant: 'default' as const,
      span: 1 as const,
    },
    { 
      id: "activeProjects", 
      title: "Active Projects", 
      value: stats ? stats.active_projects.toString() : "0", 
      icon: Layers, 
      description: "Currently in progress",
      mood: 'growth' as const,
      variant: 'default' as const,
      span: 1 as const,
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
    <div className="w-full px-[var(--space-6)] py-[var(--space-5)] space-y-[var(--space-6)]">
      {/* Header Section - more compact */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-tertiary mt-1">
            Track your learning progress and focus time
          </p>
        </div>
        
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <PeriodSelector 
            selectedPeriod={selectedPeriod}
            onPeriodChange={setPeriod}
          />
          <QuickActions />
        </div>
      </header>

      {/* Summary cards in Bento Grid with staggered animation */}
      <BentoGrid columns={4} gap="sm" className="stagger-children">
        {summaryStats.map((stat) => (
          <BentoItem key={stat.id} span={stat.span}>
            {isLoading ? (
              <SummaryCardSkeleton />
            ) : (
              <SummaryCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                description={stat.description}
                mood={stat.mood}
                variant={stat.variant}
              />
            )}
          </BentoItem>
        ))}
      </BentoGrid>

      {/* Charts in Bento Grid */}
      <BentoGrid columns={2} gap="md">
        {/* Daily Activity Chart */}
        <BentoItem span={1}>
          <Card mood="insight" className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily Activity</CardTitle>
              <CardDescription className="text-xs">Sessions and notes by date</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartLoadingSkeleton className="h-48" />
              ) : (
                <DailyActivityChart 
                  data={dailyActivity} 
                  className="h-48"
                />
              )}
            </CardContent>
          </Card>
        </BentoItem>

        {/* Project Statistics Chart */}
        <BentoItem span={1}>
          <Card mood="growth" className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Project Activity</CardTitle>
              <CardDescription className="text-xs">Sessions and notes by project</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartLoadingSkeleton className="h-48" />
              ) : (
                <ProjectStatsChart 
                  data={projectStats} 
                  className="h-48"
                />
              )}
            </CardContent>
          </Card>
        </BentoItem>

        {/* Session Timeline: spans both columns */}
        <BentoItem span={2}>
          <Card mood="focus" className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Session Timeline</CardTitle>
              <CardDescription className="text-xs">When you work throughout the day, colored by project</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartLoadingSkeleton className="h-44" />
              ) : (
                <SessionTimelineChart 
                  data={sessionTimes} 
                  className="h-44"
                />
              )}
            </CardContent>
          </Card>
        </BentoItem>
      </BentoGrid>
    </div>
  );
}
