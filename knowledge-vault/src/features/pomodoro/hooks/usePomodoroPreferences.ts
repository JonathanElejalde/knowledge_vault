import { useState, useEffect, useCallback } from 'react';
import { pomodoroApi } from '@/services/api/pomodoro';
import { getCachedApiCall } from './useApiCache';
import type { PomodoroPreferences } from '@/services/api/types/pomodoro';

export function usePomodoroPreferences() {
  const [preferences, setPreferences] = useState<PomodoroPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    
    // Use cached API call to prevent duplicates
    getCachedApiCall('pomodoro-preferences', () => pomodoroApi.getPreferences())
      .then(prefs => {
        if (mounted) {
          setPreferences(prefs);
        }
      })
      .catch(err => {
        if (mounted) setError(err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
      
    return () => { mounted = false; };
  }, []);

  const updatePreferences = useCallback(async (newPrefs: Partial<PomodoroPreferences>) => {
    setIsLoading(true);
    try {
      const updated = await pomodoroApi.updatePreferences(newPrefs);
      setPreferences(updated);
      setError(null);
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { preferences, isLoading, error, updatePreferences };
} 