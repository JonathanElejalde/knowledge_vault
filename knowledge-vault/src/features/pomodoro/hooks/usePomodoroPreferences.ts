import { useState, useEffect, useCallback } from 'react';
import { pomodoroApi } from '@/services/api/pomodoro';
import { getCachedApiCall, clearApiCache } from './useApiCache';
import type { PomodoroPreferences } from '@/services/api/types/pomodoro';

// Event emitter for preferences updates
class PreferencesEventEmitter {
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

const preferencesEventEmitter = new PreferencesEventEmitter();

// Export function to trigger preferences refresh from other components
export const triggerPreferencesRefresh = () => {
  clearApiCache('pomodoro-preferences');
  preferencesEventEmitter.emit();
};

export function usePomodoroPreferences() {
  const [preferences, setPreferences] = useState<PomodoroPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use cached API call to prevent duplicates
      const prefs = await getCachedApiCall('pomodoro-preferences', () => pomodoroApi.getPreferences());
      setPreferences(prefs);
      setError(null);
    } catch (err) {
      setError(err as Error);
      // Set default preferences on error
      setPreferences({
        work_duration: 25,
        break_duration: 5,
        long_break_duration: 15,
        long_break_interval: 4,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for preferences update events
  useEffect(() => {
    const unsubscribe = preferencesEventEmitter.subscribe(() => {
      fetchPreferences();
    });
    return unsubscribe;
  }, [fetchPreferences]);

  // Initial load
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (newPrefs: Partial<PomodoroPreferences>) => {
    setIsLoading(true);
    try {
      const updated = await pomodoroApi.updatePreferences(newPrefs);
      setPreferences(updated);
      setError(null);
      
      // Trigger refresh for all other components using preferences
      triggerPreferencesRefresh();
      
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { 
    preferences, 
    isLoading, 
    error, 
    updatePreferences,
    refreshPreferences: fetchPreferences 
  };
} 