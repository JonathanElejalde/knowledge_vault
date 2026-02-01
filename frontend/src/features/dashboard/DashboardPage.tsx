import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Clock, FileText, Layers, MoreHorizontal } from "lucide-react";
import SummaryCard from "./components/SummaryCard";
import QuickActions from "./components/QuickActions";
import PeriodSelector from "./components/PeriodSelector";
import DailyActivityChart from "./components/DailyActivityChart";
import ProjectStatsChart from "./components/ProjectStatsChart";
import SessionTimelineChart from "./components/SessionTimelineChart";
import { ChartLoadingSkeleton, SummaryCardSkeleton } from "./components/LoadingSkeleton";
import { useDashboard } from "./hooks/useDashboard";
import { formatFocusTime } from "./utils/formatters";
import { cn } from "@/lib/utils";

/**
 * DashboardPage - Deep Focus Design
 * 
 * Layout structure:
 * 1. Header: Title + description (left) | Filters + Actions (right)
 * 2. Period tabs
 * 3. Summary cards: 3-column grid (Focus Time, Notes, Projects)
 * 4. Charts: 2-column grid (Daily Activity, Project Activity)
 * 5. Session Timeline: Full width
 */
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

  // Summary stats configuration
  const summaryStats = [
    { 
      id: "focusTime", 
      title: "Total Focus Time", 
      value: stats ? formatFocusTime(stats.total_focus_time) : "0m", 
      icon: Clock, 
      description: getPeriodLabel(),
      mood: 'focus' as const,
    },
    { 
      id: "notesCreated", 
      title: "Notes Created", 
      value: stats ? stats.notes_created.toString() : "0", 
      icon: FileText, 
      description: getPeriodLabel(),
      mood: 'insight' as const,
    },
    { 
      id: "activeProjects", 
      title: "Active Projects", 
      value: stats ? stats.active_projects.toString() : "0", 
      icon: Layers, 
      description: "In Progress",
      mood: 'growth' as const,
    },
  ];

  if (error) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-semantic-danger mb-2">Failed to load dashboard data</p>
            <p className="text-sm text-text-tertiary">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        {/* Title & Description */}
        <div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">
            Dashboard
          </h2>
          <p className="mt-2 text-text-tertiary text-sm max-w-xl">
            Track your deep work sessions and knowledge accumulation. Focus on the process, not just the outcome.
          </p>
        </div>
        
        {/* Actions */}
        <QuickActions />
      </div>

      {/* Period Selector */}
      <div className="mb-8">
        <PeriodSelector 
          selectedPeriod={selectedPeriod}
          onPeriodChange={setPeriod}
        />
      </div>

      {/* Summary Cards Grid - 3 columns on md+, stack on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {summaryStats.map((stat) => (
          isLoading ? (
            <SummaryCardSkeleton key={stat.id} />
          ) : (
            <SummaryCard
              key={stat.id}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              description={stat.description}
              mood={stat.mood}
            />
          )
        ))}
      </div>

      {/* Charts Grid - 2 columns on lg+, stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Activity Chart */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Daily Activity</CardTitle>
              <CardDescription className="text-xs">Sessions and notes by date</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoadingSkeleton className="h-[280px]" />
            ) : (
              <DailyActivityChart 
                data={dailyActivity} 
                className="h-[280px]"
              />
            )}
          </CardContent>
        </Card>

        {/* Project Statistics Chart */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2 flex flex-row justify-between items-start">
            <div>
              <CardTitle className="text-base font-semibold">Project Activity</CardTitle>
              <CardDescription className="text-xs">Sessions and notes by project</CardDescription>
            </div>
            <button className="text-text-muted hover:text-text-secondary transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartLoadingSkeleton className="h-[280px]" />
            ) : (
              <ProjectStatsChart 
                data={projectStats} 
                className="h-[280px]"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Timeline - Full Width */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Session Timeline</CardTitle>
          <CardDescription className="text-xs">When you work throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartLoadingSkeleton className="h-[250px]" />
          ) : (
            <SessionTimelineChart 
              data={sessionTimes} 
              className="h-[250px]"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
