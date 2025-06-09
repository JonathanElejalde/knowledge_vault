import { useState, useEffect, useCallback, useMemo } from 'react';
import { dashboardApi } from '@/services/api/dashboard';
import { getCachedApiCall, clearApiCache } from './useApiCache';
import type { 
  DashboardData, 
  DashboardPeriod,
  DashboardStats,
  ProjectStats,
  DailyActivity,
  SessionTime
} from '@/services/api/types/dashboard';

interface UseDashboardState {
  // Data
  dashboardData: DashboardData | null;
  stats: DashboardStats | null;
  projectStats: ProjectStats[];
  dailyActivity: DailyActivity[];
  sessionTimes: SessionTime[];
  
  // UI State
  selectedPeriod: DashboardPeriod;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setPeriod: (period: DashboardPeriod) => void;
  refreshData: () => Promise<void>;
}

export function useDashboard(): UseDashboardState {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized derived data
  const stats = useMemo(() => dashboardData?.stats || null, [dashboardData]);
  const projectStats = useMemo(() => dashboardData?.project_stats || [], [dashboardData]);
  const dailyActivity = useMemo(() => dashboardData?.daily_activity || [], [dashboardData]);
  const sessionTimes = useMemo(() => dashboardData?.session_times || [], [dashboardData]);

  const fetchDashboardData = useCallback(async (period: DashboardPeriod) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data for period:', period);
      
      const cacheKey = `dashboard-data-${period}`;
      const data = await getCachedApiCall(cacheKey, () => 
        dashboardApi.getDashboardData({ period })
      );
      
      console.log('Dashboard data received:', data);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPeriod = useCallback((period: DashboardPeriod) => {
    console.log('Setting period to:', period);
    setSelectedPeriod(period);
  }, []);

  const refreshData = useCallback(async () => {
    console.log('Refreshing dashboard data');
    clearApiCache(); // Clear all cached data
    await fetchDashboardData(selectedPeriod);
  }, [fetchDashboardData, selectedPeriod]);

  // Fetch data when period changes
  useEffect(() => {
    fetchDashboardData(selectedPeriod);
  }, [fetchDashboardData, selectedPeriod]);

  return {
    dashboardData,
    stats,
    projectStats,
    dailyActivity,
    sessionTimes,
    selectedPeriod,
    isLoading,
    error,
    setPeriod,
    refreshData,
  };
} 