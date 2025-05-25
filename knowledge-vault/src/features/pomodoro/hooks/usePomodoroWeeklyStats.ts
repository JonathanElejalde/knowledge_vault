import { useState, useEffect, useCallback } from 'react';
import { pomodoroApi } from '@/services/api/pomodoro';
import { getCachedApiCall, clearApiCache } from './internal';
import type { WeeklyStatisticsResponse } from '@/services/api/types/pomodoro';

// Global event emitter for weekly statistics updates
class WeeklyStatsEventEmitter {
  private listeners: (() => void)[] = [];

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  emit() {
    this.listeners.forEach(callback => callback());
  }
}

const weeklyStatsEventEmitter = new WeeklyStatsEventEmitter();

// Export function to trigger weekly stats refresh from other hooks
export const triggerWeeklyStatsRefresh = () => {
  // Clear the cache to force fresh data
  clearApiCache('pomodoro-weekly-statistics');
  weeklyStatsEventEmitter.emit();
};

export function usePomodoroWeeklyStats() {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWeeklyStats = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use cached API call to prevent duplicates
      const data = await getCachedApiCall('pomodoro-weekly-statistics', () => pomodoroApi.getWeeklyStatistics());
      setWeeklyStats(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyStats();
  }, [fetchWeeklyStats]);

  // Listen for weekly stats update events
  useEffect(() => {
    const unsubscribe = weeklyStatsEventEmitter.subscribe(() => {
      fetchWeeklyStats();
    });
    return unsubscribe;
  }, [fetchWeeklyStats]);

  return { weeklyStats, isLoading, error, refreshWeeklyStats: fetchWeeklyStats };
} 