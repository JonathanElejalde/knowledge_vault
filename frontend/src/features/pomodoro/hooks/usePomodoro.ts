import { useState, useEffect, useCallback, useRef } from 'react';
import { pomodoroApi } from '@/services/api/pomodoro';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { usePomodoroPreferences, triggerSummaryRefresh, triggerWeeklyStatsRefresh } from './internal';
import type {
  PomodoroPreferences,
  PomodoroSession,
} from '@/services/api/types/pomodoro';

// Use TimerState from the store directly
// No, it's better to use PomodoroStoreState['timerState'] for clarity
// type TimerState = PomodoroStoreState['timerState']; // This is also an option

interface UsePomodoroState {
  // Timer state (from store - single source of truth)
  timerState: 'idle' | 'work' | 'break' | 'longBreak';
  isRunning: boolean;
  timeLeft: number; // in seconds
  completedIntervals: number;

  // Current session (hook-managed)
  currentSession: PomodoroSession | null;
  selectedProjectId: string | null;

  // Preferences (from dedicated hook)
  preferences: PomodoroPreferences;
  isLoadingPreferences: boolean;

  // Actions
  startTimer: (projectId?: string) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  abandonSession: () => Promise<void>;
  updatePreferences: (newPreferences: Partial<PomodoroPreferences>) => Promise<void>;
  setSelectedProjectId: (projectId: string | null) => void;
}

export function usePomodoro(): UsePomodoroState {
  // ✅ CORRECT: Get shared timer state from store (single source of truth)
  const {
    timerState,
    isRunning,
    timeLeft,
    completedIntervals,
    selectedProjectId,
    currentSessionId,
    setSelectedProjectId,
    startTimer: startGlobalTimer,
    pauseTimer: pauseGlobalTimer,
    resumeTimer: resumeGlobalTimer,
    resetTimer: resetGlobalTimer,
    setPreferences: setGlobalPreferences,
    updateHeartbeat,
  } = usePomodoroStore();

  // ✅ CORRECT: Get preferences from dedicated hook
  const { 
    preferences, 
    isLoading: isLoadingPreferences, 
    updatePreferences: updatePreferencesApi 
  } = usePomodoroPreferences();

  // ✅ CORRECT: Component-specific state in hook
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);

  // Refs for tracking state changes and preventing duplicate API calls
  const previousCompletedIntervalsRef = useRef(completedIntervals);
  const previousTimerStateRef = useRef(timerState);
  const completionInProgressRef = useRef(false);
  const sessionIdRef = useRef(currentSessionId);

  // Default preferences fallback
  const safePreferences = preferences ?? {
    work_duration: 25,
    break_duration: 5,
    long_break_duration: 15,
    long_break_interval: 4,
  };

  // ✅ CORRECT: Sync preferences to store when they change
  useEffect(() => {
    if (preferences) {
      setGlobalPreferences({
        workDuration: preferences.work_duration,
        breakDuration: preferences.break_duration,
        longBreakDuration: preferences.long_break_duration,
        longBreakInterval: preferences.long_break_interval,
      });
    }
  }, [preferences, setGlobalPreferences]);

  // ✅ IMPROVED: Handle session completion with better tracking
  useEffect(() => {
    const shouldCompleteSession = (
      completedIntervals > previousCompletedIntervalsRef.current &&
      previousTimerStateRef.current === 'work' &&
      !completionInProgressRef.current &&
      sessionIdRef.current &&
      !sessionIdRef.current.startsWith('fallback-') // Don't complete fallback sessions
    );

    if (shouldCompleteSession) {
      // Immediately update refs to prevent race conditions
      previousCompletedIntervalsRef.current = completedIntervals;
      completionInProgressRef.current = true;

      const completeWorkSession = async () => {
        try {
          const sessionId = sessionIdRef.current;
          if (sessionId && !sessionId.startsWith('fallback-')) {
            console.log('🎯 Completing work session:', sessionId);
            
            await pomodoroApi.completeSession(sessionId, {
              actual_duration: safePreferences.work_duration, // Use planned duration for completed sessions
            });

            console.log('✅ Session completed successfully');
            triggerSummaryRefresh();
            triggerWeeklyStatsRefresh();
          }
        } catch (error) {
          console.error('❌ Failed to complete session:', error);
        } finally {
          completionInProgressRef.current = false;
        }
      };

      completeWorkSession();
    }
    
    // Always update tracking refs
    previousCompletedIntervalsRef.current = completedIntervals;
    previousTimerStateRef.current = timerState;
    sessionIdRef.current = currentSessionId;
  }, [completedIntervals, timerState, currentSessionId, safePreferences.work_duration]);

  // ✅ IMPROVED: Heartbeat mechanism for long-running sessions
  useEffect(() => {
    if (isRunning && currentSessionId) {
      const heartbeatInterval = setInterval(() => {
        updateHeartbeat();
      }, 30000); // Every 30 seconds

      return () => clearInterval(heartbeatInterval);
    }
  }, [isRunning, currentSessionId, updateHeartbeat]);

  // ✅ IMPROVED: Start timer action with better error handling
  const startTimer = useCallback(async (projectId?: string) => {
    try {
      const sessionData = {
        learning_project_id: projectId || selectedProjectId || undefined,
        session_type: 'work' as const,
        work_duration: safePreferences.work_duration,
        break_duration: safePreferences.break_duration,
      };
      
      const session = await pomodoroApi.startSession(sessionData);
      
      setCurrentSession(session);
      
      // Reset the completion tracking refs for the new session
      previousCompletedIntervalsRef.current = completedIntervals;
      completionInProgressRef.current = false;
      sessionIdRef.current = session.id;
      
      startGlobalTimer(session.id, projectId || selectedProjectId || undefined);
      
    } catch (error) {
      console.warn('⚠️ API session creation failed, using fallback:', error);
      
      // Fallback: start timer without API session
      const fallbackSessionId = `fallback-${Date.now()}`;
      const fallbackSession = {
        id: fallbackSessionId,
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
      } as PomodoroSession;
      
      setCurrentSession(fallbackSession);
      
      // Reset the completion tracking refs for the fallback session too
      previousCompletedIntervalsRef.current = completedIntervals;
      completionInProgressRef.current = false;
      sessionIdRef.current = fallbackSessionId;
      
      startGlobalTimer(fallbackSessionId, projectId || selectedProjectId || undefined);
    }
  }, [safePreferences, selectedProjectId, startGlobalTimer, completedIntervals]);

  // ✅ CORRECT: Pause timer action
  const pauseTimer = useCallback(() => {
    pauseGlobalTimer();
  }, [pauseGlobalTimer]);

  // ✅ CORRECT: Resume timer action
  const resumeTimer = useCallback(() => {
    resumeGlobalTimer();
  }, [resumeGlobalTimer]);

  // ✅ IMPROVED: Abandon session action with better duration calculation
  const abandonSession = useCallback(async () => {
    try {
      const sessionId = currentSessionId || sessionIdRef.current;
      
      // Only call API if we have a valid session
      if (sessionId && !sessionId.startsWith('fallback-')) {
        // Calculate actual duration worked using store state
        const storeState = usePomodoroStore.getState();
        let actualDurationSeconds = 0;
        
        if (storeState.startTime) {
          const now = Date.now();
          const totalElapsed = now - storeState.startTime - storeState.pausedTime;
          actualDurationSeconds = Math.floor(totalElapsed / 1000);
        }
        
        // Ensure at least 1 minute is sent
        const actualDurationMinutes = Math.max(1, Math.round(actualDurationSeconds / 60));
        
        await pomodoroApi.abandonSession(sessionId, {
          actual_duration: actualDurationMinutes,
          reason: 'User abandoned session'
        });
        
        triggerSummaryRefresh();
        triggerWeeklyStatsRefresh();
      } else {
        // Clear session state for fallback sessions
        setCurrentSession(null);
      }
      
      // Always reset timer regardless of API success/failure or session state
      resetGlobalTimer();
      setCurrentSession(null);
      sessionIdRef.current = null;
      
    } catch (error) {
      console.error('❌ Failed to abandon session:', error);
      // Still reset timer even if API call fails
      resetGlobalTimer();
      setCurrentSession(null);
      sessionIdRef.current = null;
    }
  }, [currentSessionId, resetGlobalTimer]);

  // ✅ CORRECT: Update preferences with proper timing logic
  const updatePreferences = useCallback(async (newPreferences: Partial<PomodoroPreferences>) => {
    const hasActiveSession = currentSessionId && (timerState === 'work' || timerState === 'break' || timerState === 'longBreak');
    
    try {
      await updatePreferencesApi(newPreferences);
      
      if (!hasActiveSession) {
        // No active session - preferences will update immediately via the effect above
      } else {
        // Preferences will take effect after current session cycle
      }
      
    } catch (error) {
      console.error('❌ Failed to update preferences:', error);
      throw error;
    }
  }, [updatePreferencesApi, currentSessionId, timerState]);

  // ✅ CORRECT: Set selected project
  const setSelectedProjectIdAction = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
  }, [setSelectedProjectId]);

  // ✅ RECOVERY: Initialize session recovery if needed
  useEffect(() => {
    // If we have a persisted currentSessionId but no currentSession, try to recover
    if (currentSessionId && !currentSession && !currentSessionId.startsWith('fallback-')) {
      // Create a placeholder session for UI purposes
      const recoveredSession = {
        id: currentSessionId,
        user_id: 'recovered',
        learning_project_id: selectedProjectId,
        session_type: 'work',
        status: 'in_progress',
        start_time: new Date().toISOString(),
        work_duration: safePreferences.work_duration,
        break_duration: safePreferences.break_duration,
        actual_duration: undefined,
        end_time: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as PomodoroSession;
      
      setCurrentSession(recoveredSession);
      sessionIdRef.current = currentSessionId;
    }
  }, [currentSessionId, currentSession, selectedProjectId, safePreferences]);

  return {
    // Timer state from store
    timerState,
    isRunning,
    timeLeft,
    completedIntervals,
    
    // Session state from hook
    currentSession,
    selectedProjectId,
    
    // Preferences from dedicated hook
    preferences: safePreferences,
    isLoadingPreferences,
    
    // Actions
    startTimer,
    pauseTimer,
    resumeTimer,
    abandonSession,
    updatePreferences,
    setSelectedProjectId: setSelectedProjectIdAction,
  };
} 