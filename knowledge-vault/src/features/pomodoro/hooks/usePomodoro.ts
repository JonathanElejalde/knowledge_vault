import { useState, useEffect, useCallback, useRef } from 'react';
import { pomodoroApi } from '@/services/api/pomodoro';
import { usePomodoroStore, type PomodoroStoreState } from '@/store/pomodoroStore';
import type {
  PomodoroPreferences,
  PomodoroSession,
} from '@/services/api/types/pomodoro';
import { usePomodoroPreferences } from './usePomodoroPreferences';
import { triggerSummaryRefresh } from './usePomodoroSummary';

// Use TimerState from the store directly
// No, it's better to use PomodoroStoreState['timerState'] for clarity
// type TimerState = PomodoroStoreState['timerState']; // This is also an option

interface UsePomodoroState {
  // Timer state (mostly from store)
  timerState: PomodoroStoreState['timerState'];
  isRunning: boolean;
  timeLeft: number; // in seconds
  completedIntervals: number;

  // Current session
  currentSession: PomodoroSession | null;
  selectedProjectId: string | null;

  // Preferences
  preferences: PomodoroPreferences;
  isLoadingPreferences: boolean;

  // Actions
  startTimer: (projectId?: string) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => Promise<void>;
  startNextSession: () => void;
  updatePreferences: (newPreferences: Partial<PomodoroPreferences>) => Promise<void>;
  setSelectedProjectId: (projectId: string | null) => void;
  abandonSession: () => Promise<void>;
}

export function usePomodoro(): UsePomodoroState {
  const {
    timerState,
    isRunning,
    timeLeft,
    completedIntervals,
    selectedProjectId,
    setSelectedProjectId: setGlobalSelectedProjectId,
    startTimer: startGlobalTimer,
    pauseTimer: pauseGlobalTimer,
    resumeTimer: resumeGlobalTimer,
    resetTimer: resetGlobalTimer,
    startNextSession: startGlobalNextSession,
  } = usePomodoroStore();

  const [currentSessionHook, setCurrentSessionHook] = useState<PomodoroSession | null>(null);
  const { preferences, isLoading: isLoadingPreferences, updatePreferences: updatePreferencesRaw } = usePomodoroPreferences();

  // Null-safe fallback for preferences
  const safePreferences = preferences ?? {
    work_duration: 25,
    break_duration: 5,
    long_break_duration: 15,
    long_break_interval: 4,
  };

  // Wrap updatePreferences to match expected return type (Promise<void>)
  const updatePreferences = async (newPreferences: Partial<PomodoroPreferences>) => {
    await updatePreferencesRaw(newPreferences);
  };

  // Session completion effect - only handle session completion, no summary refresh
  const previousCompletedIntervalsRef = useRef(completedIntervals);
  const previousTimerStateRef = useRef(timerState);
  const completionInProgressRef = useRef(false);
  
  useEffect(() => {
    if (
      completedIntervals > previousCompletedIntervalsRef.current &&
      previousTimerStateRef.current === 'work' &&
      !completionInProgressRef.current
    ) {
      previousCompletedIntervalsRef.current = completedIntervals;
      completionInProgressRef.current = true;

      const completeWorkSession = async () => {
        try {
          if (currentSessionHook?.id) {
            await pomodoroApi.completeSession(currentSessionHook.id, {
              actual_duration: currentSessionHook.work_duration,
            });
            // Trigger summary refresh after successful completion
            triggerSummaryRefresh();
          }
        } catch (error) {
          console.error('Failed to complete session:', error);
        } finally {
          completionInProgressRef.current = false;
        }
      };

      completeWorkSession();
    }
    
    previousTimerStateRef.current = timerState;
  }, [completedIntervals, timerState, currentSessionHook]);

  const startTimer = useCallback(async (projectId?: string) => {
    try {
      const currentTimerState = usePomodoroStore.getState().timerState;
      if (currentTimerState === 'idle' || currentTimerState === 'work') {
        const sessionData = {
          learning_project_id: projectId || selectedProjectId || undefined,
          session_type: 'work' as const,
          work_duration: safePreferences.work_duration,
          break_duration: safePreferences.break_duration,
        };
        const session = await pomodoroApi.startSession(sessionData);
        setCurrentSessionHook(session);
        startGlobalTimer(session.id, projectId || selectedProjectId || undefined);
      } else {
        console.warn('startTimer called during break/longBreak, consider using startNextSession');
        startGlobalNextSession(); 
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      startGlobalTimer('fallback-session-id', projectId || selectedProjectId || undefined);
      setCurrentSessionHook({ 
        id: 'fallback-session-id',
        user_id: 'unknown',
        learning_project_id: projectId || selectedProjectId || undefined,
        session_type: 'work',
        status: 'in_progress',
        start_time: new Date().toISOString(),
        work_duration: safePreferences.work_duration,
        break_duration: safePreferences.break_duration,
        actual_duration: undefined,
        end_time: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as PomodoroSession);
    }
  }, [safePreferences, selectedProjectId, startGlobalTimer, startGlobalNextSession]);

  const pauseTimerHook = useCallback(() => {
    pauseGlobalTimer();
  }, [pauseGlobalTimer]);

  const resumeTimerHook = useCallback(() => {
    resumeGlobalTimer();
  }, [resumeGlobalTimer]);

  const resetTimerHook = useCallback(async () => {
    if (currentSessionHook) {
      try {
        const storeStartTime = usePomodoroStore.getState().startTime;
        let actualDurationSeconds = 0;
        if (storeStartTime) {
          actualDurationSeconds = Math.floor((Date.now() - storeStartTime) / 1000);
        } else {
          const storeTimeLeft = usePomodoroStore.getState().timeLeft;
          const plannedDurationSeconds = safePreferences.work_duration * 60;
          actualDurationSeconds = plannedDurationSeconds - storeTimeLeft;
        }
        await pomodoroApi.abandonSession(currentSessionHook.id, {
          actual_duration: Math.max(0, Math.round(actualDurationSeconds / 60)),
          reason: 'User reset timer'
        });
        setCurrentSessionHook(null);
        // Trigger summary refresh after reset
        triggerSummaryRefresh();
      } catch (error) {
        console.error('Failed to abandon session:', error);
      }
    }
    resetGlobalTimer();
  }, [currentSessionHook, resetGlobalTimer, safePreferences]);

  const setSelectedProjectIdHook = useCallback((projectId: string | null) => {
    setGlobalSelectedProjectId(projectId);
  }, [setGlobalSelectedProjectId]);

  const abandonSessionHook = useCallback(async () => {
    if (currentSessionHook) {
      try {
        const storeStartTime = usePomodoroStore.getState().startTime;
        let actualDurationSeconds = 0;
        if (storeStartTime && isRunning) { 
          actualDurationSeconds = Math.floor((Date.now() - storeStartTime) / 1000);
        } else {
            const plannedDurationSeconds = safePreferences.work_duration * 60;
            actualDurationSeconds = plannedDurationSeconds - timeLeft; 
        }
        await pomodoroApi.abandonSession(currentSessionHook.id, {
          actual_duration: Math.max(0, Math.round(actualDurationSeconds / 60)),
          reason: 'User abandoned session'
        });
        setCurrentSessionHook(null);
        // Trigger summary refresh after abandon
        triggerSummaryRefresh();
      } catch (error) {
        console.error('Failed to abandon session during explicit abandon call:', error);
      }
    }
    resetGlobalTimer(); 
  }, [currentSessionHook, resetGlobalTimer, timeLeft, isRunning, safePreferences]);

  return {
    timerState,
    isRunning,
    timeLeft,
    completedIntervals,
    currentSession: currentSessionHook,
    selectedProjectId,
    preferences: safePreferences,
    isLoadingPreferences,
    startTimer,
    pauseTimer: pauseTimerHook,
    resumeTimer: resumeTimerHook,
    resetTimer: resetTimerHook,
    startNextSession: startGlobalNextSession,
    updatePreferences,
    setSelectedProjectId: setSelectedProjectIdHook,
    abandonSession: abandonSessionHook,
  };
} 