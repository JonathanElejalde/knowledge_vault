import { useState, useEffect, useCallback } from 'react';
import { pomodoroApi } from '@/services/api/pomodoro';
import { getCachedApiCall, clearApiCache } from './internal';
import type { PomodoroSessionSummary } from '@/services/api/types/pomodoro';

// Global event emitter for session updates
class SessionEventEmitter {
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

const sessionEventEmitter = new SessionEventEmitter();

// Export function to trigger summary refresh from other hooks
export const triggerSummaryRefresh = () => {
  // Clear the cache to force fresh data
  clearApiCache('pomodoro-summary');
  sessionEventEmitter.emit();
};

export function usePomodoroSummary() {
  const [summary, setSummary] = useState<PomodoroSessionSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use cached API call to prevent duplicates
      const data = await getCachedApiCall('pomodoro-summary', () => pomodoroApi.getSessionSummary());
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Listen for session update events
  useEffect(() => {
    const unsubscribe = sessionEventEmitter.subscribe(() => {
      fetchSummary();
    });
    return unsubscribe;
  }, [fetchSummary]);

  return { summary, isLoading, error, refreshSummary: fetchSummary };
} 