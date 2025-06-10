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
    setSelectedProjectId,
    startTimer: startGlobalTimer,
    pauseTimer: pauseGlobalTimer,
    resumeTimer: resumeGlobalTimer,
    resetTimer: resetGlobalTimer,
    setPreferences: setGlobalPreferences,
  } = usePomodoroStore();

  // ✅ CORRECT: Get preferences from dedicated hook
  const { 
    preferences, 
    isLoading: isLoadingPreferences, 
    updatePreferences: updatePreferencesApi 
  } = usePomodoroPreferences();

  // ✅ CORRECT: Component-specific state in hook
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);

  // Refs for tracking state changes
  const previousCompletedIntervalsRef = useRef(completedIntervals);
  const previousTimerStateRef = useRef(timerState);
  const completionInProgressRef = useRef(false);

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

  // ✅ CORRECT: Handle session completion when work interval completes
  useEffect(() => {
    // DEBUG_LOGS_START
    console.log('🔍 COMPLETION EFFECT TRIGGERED:', {
      completedIntervals,
      previousCompletedIntervals: previousCompletedIntervalsRef.current,
      timerState,
      previousTimerState: previousTimerStateRef.current,
      completionInProgress: completionInProgressRef.current,
      currentSessionId: currentSession?.id,
      currentSessionWorkDuration: currentSession?.work_duration,
      timestamp: new Date().toISOString()
    });
    // DEBUG_LOGS_END

    const shouldCompleteSession = (
      completedIntervals > previousCompletedIntervalsRef.current &&
      previousTimerStateRef.current === 'work' &&
      !completionInProgressRef.current &&
      currentSession?.id
    );

    // DEBUG_LOGS_START
    console.log('🔍 SHOULD COMPLETE SESSION:', shouldCompleteSession, {
      intervalIncreased: completedIntervals > previousCompletedIntervalsRef.current,
      wasInWorkState: previousTimerStateRef.current === 'work',
      notInProgress: !completionInProgressRef.current,
      hasSessionId: !!currentSession?.id
    });
    // DEBUG_LOGS_END

    if (shouldCompleteSession) {
      // DEBUG_LOGS_START
      console.log('✅ STARTING SESSION COMPLETION:', {
        sessionId: currentSession.id,
        workDuration: currentSession.work_duration,
        completedIntervals,
        timestamp: new Date().toISOString()
      });
      // DEBUG_LOGS_END

      previousCompletedIntervalsRef.current = completedIntervals;
      completionInProgressRef.current = true;

      const completeWorkSession = async () => {
        try {
          if (currentSession?.id) {
            // DEBUG_LOGS_START
            console.log('🚀 CALLING API COMPLETE SESSION:', {
              sessionId: currentSession.id,
              actualDuration: currentSession.work_duration,
              timestamp: new Date().toISOString()
            });
            // DEBUG_LOGS_END

            await pomodoroApi.completeSession(currentSession.id, {
              actual_duration: currentSession.work_duration,
            });

            // DEBUG_LOGS_START
            console.log('✅ API COMPLETE SESSION SUCCESS:', {
              sessionId: currentSession.id,
              timestamp: new Date().toISOString()
            });
            // DEBUG_LOGS_END

            triggerSummaryRefresh();
            triggerWeeklyStatsRefresh();
          }
        } catch (error) {
          console.error('❌ Failed to complete session:', error);
        } finally {
          // DEBUG_LOGS_START
          console.log('🏁 COMPLETION FINISHED, resetting flag:', {
            sessionId: currentSession?.id,
            timestamp: new Date().toISOString()
          });
          // DEBUG_LOGS_END
          completionInProgressRef.current = false;
        }
      };

      completeWorkSession();
    }
    
    previousTimerStateRef.current = timerState;
    // DEBUG_LOGS_START
    console.log('🔄 UPDATED PREVIOUS TIMER STATE TO:', timerState);
    // DEBUG_LOGS_END
  }, [completedIntervals, timerState, currentSession]);

  // ✅ CORRECT: Start timer action
  const startTimer = useCallback(async (projectId?: string) => {
    // DEBUG_LOGS_START
    console.log('🚀 START TIMER CALLED:', {
      projectId,
      selectedProjectId,
      workDuration: safePreferences.work_duration,
      currentCompletedIntervals: completedIntervals,
      timestamp: new Date().toISOString()
    });
    // DEBUG_LOGS_END

    try {
      const sessionData = {
        learning_project_id: projectId || selectedProjectId || undefined,
        session_type: 'work' as const,
        work_duration: safePreferences.work_duration,
        break_duration: safePreferences.break_duration,
      };
      
      // DEBUG_LOGS_START
      console.log('🚀 CALLING API START SESSION:', sessionData);
      // DEBUG_LOGS_END
      const session = await pomodoroApi.startSession(sessionData);
      // DEBUG_LOGS_START
      console.log('✅ API START SESSION SUCCESS:', session);
      // DEBUG_LOGS_END
      
      setCurrentSession(session);
      
      // Reset the completion tracking refs for the new session
      previousCompletedIntervalsRef.current = completedIntervals;
      completionInProgressRef.current = false;
      
      // DEBUG_LOGS_START
      console.log('🚀 STARTING GLOBAL TIMER:', {
        sessionId: session.id,
        projectId: projectId || selectedProjectId || undefined,
        resetCompletedIntervals: completedIntervals,
        timestamp: new Date().toISOString()
      });
      // DEBUG_LOGS_END
      
      startGlobalTimer(session.id, projectId || selectedProjectId || undefined);
      
    } catch (error) {
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

  // ✅ CORRECT: Abandon session action
  const abandonSession = useCallback(async () => {
    try {
      // Only call API if we have a valid session
      if (currentSession?.id && !currentSession.id.startsWith('fallback-')) {
        // Calculate actual duration worked
        const storeState = usePomodoroStore.getState();
        let actualDurationSeconds = 0;
        
        if (storeState.startTime && isRunning) {
          // Timer is running - calculate from start time
          actualDurationSeconds = Math.floor((Date.now() - storeState.startTime) / 1000);
        } else {
          // Timer is paused - calculate from time elapsed
          const plannedDurationSeconds = safePreferences.work_duration * 60;
          actualDurationSeconds = plannedDurationSeconds - timeLeft;
        }
        
        // Ensure at least 1 minute is sent
        const actualDurationMinutes = Math.max(1, Math.round(actualDurationSeconds / 60));
        
        await pomodoroApi.abandonSession(currentSession.id, {
          actual_duration: actualDurationMinutes,
          reason: 'User abandoned session'
        });
        
        triggerSummaryRefresh();
        triggerWeeklyStatsRefresh();
      } else {
        // Clear session state
        setCurrentSession(null);
      }
      
      // Always reset timer regardless of API success/failure or session state
      resetGlobalTimer();
    } catch (error) {
      console.error('Failed to abandon session:', error);
    }
  }, [currentSession, resetGlobalTimer, timeLeft, isRunning, safePreferences]);

  // ✅ CORRECT: Update preferences with proper timing logic
  const updatePreferences = useCallback(async (newPreferences: Partial<PomodoroPreferences>) => {
    const hasActiveSession = currentSession && (timerState === 'work' || timerState === 'break' || timerState === 'longBreak');
    
    try {
      await updatePreferencesApi(newPreferences);
      
      if (!hasActiveSession) {
        // No active session - preferences will update immediately via the effect above
        // The store will be updated when preferences hook triggers refresh
      }
      // If there's an active session, preferences will take effect after the full cycle
      // (work + break) completes, which is handled by the sync effect above
      
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }, [updatePreferencesApi, currentSession, timerState]);

  // ✅ CORRECT: Set selected project
  const setSelectedProjectIdAction = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
  }, [setSelectedProjectId]);

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