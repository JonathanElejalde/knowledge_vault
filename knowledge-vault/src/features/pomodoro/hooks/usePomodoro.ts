import { useState, useEffect, useCallback, useRef } from 'react';
import { pomodoroApi } from '@/services/api/pomodoro';
import { usePomodoroStore, type PomodoroStoreState } from '@/store/pomodoroStore';
import type {
  PomodoroPreferences,
  PomodoroSession,
  PomodoroSessionWithProject,
  PomodoroStatistics,
  PomodoroSessionSummary,
} from '@/services/api/types/pomodoro';

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

  // Sessions history
  sessions: PomodoroSessionWithProject[];
  isLoadingSessions: boolean;

  // Statistics
  statistics: PomodoroStatistics;
  isLoadingStatistics: boolean;

  // Session Summary (from shared store)
  sessionSummary: PomodoroSessionSummary[] | null;
  isLoadingSessionSummary: boolean;

  // Actions
  startTimer: (projectId?: string) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void; // From store
  resetTimer: () => Promise<void>;
  startNextSession: () => void; // New from store
  updatePreferences: (newPreferences: Partial<PomodoroPreferences>) => Promise<void>;
  setSelectedProjectId: (projectId: string | null) => void;
  refreshSessions: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
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
    resumeTimer: resumeGlobalTimer, // New from store
    resetTimer: resetGlobalTimer,
    startNextSession: startGlobalNextSession, // New from store
    setPreferences: setGlobalPreferences,
    // ✅ NEW: Get session summary from shared store
    sessionSummary,
    isLoadingSessionSummary,
    setSessionSummary,
    setIsLoadingSessionSummary,
  } = usePomodoroStore();

  const [currentSessionHook, setCurrentSessionHook] = useState<PomodoroSession | null>(null);

  const [preferences, setPreferences] = useState<PomodoroPreferences>({
    work_duration: usePomodoroStore.getState().workDuration,
    break_duration: usePomodoroStore.getState().breakDuration,
    long_break_duration: usePomodoroStore.getState().longBreakDuration,
    long_break_interval: usePomodoroStore.getState().longBreakInterval,
  });
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  const [sessions, setSessions] = useState<PomodoroSessionWithProject[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const [statistics, setStatistics] = useState<PomodoroStatistics>({
    total_focus_time: 0,
    completed_sessions: 0,
    total_sessions: 0,
    weekly_goal: 900, // TODO: This could come from preferences or be fixed
    weekly_progress: 0,
  });
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(true);

  // Define refresh functions first
  const refreshSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      const sessionsData = await pomodoroApi.getSessions({ limit: 10 });
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]); // Set to empty array on error
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const refreshStatistics = useCallback(async () => {
    try {
      setIsLoadingStatistics(true);
      const stats = await pomodoroApi.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      // Keep existing/default stats on error or set to a default error state
    } finally {
      setIsLoadingStatistics(false);
    }
  }, []);

  // ✅ FIXED: Initial data load without circular dependencies
  useEffect(() => {
    const loadInitialData = async () => {
      // Load preferences first
      try {
        setIsLoadingPreferences(true);
        const prefs = await pomodoroApi.getPreferences();
        setPreferences(prefs);
        setGlobalPreferences({
          workDuration: prefs.work_duration,
          breakDuration: prefs.break_duration,
          longBreakDuration: prefs.long_break_duration,
          longBreakInterval: prefs.long_break_interval,
        });
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }

      // Load sessions
      try {
        setIsLoadingSessions(true);
        const sessionsData = await pomodoroApi.getSessions({ limit: 10 });
        setSessions(sessionsData);
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }

      // Load statistics
      try {
        setIsLoadingStatistics(true);
        const stats = await pomodoroApi.getStatistics();
        setStatistics(stats);
      } catch (error) {
        console.error('Failed to load statistics:', error);
      } finally {
        setIsLoadingStatistics(false);
      }

      // Load session summary
      try {
        setIsLoadingSessionSummary(true);
        const summaryData = await pomodoroApi.getSessionSummary();
        setSessionSummary(summaryData);
      } catch (error) {
        console.error('Failed to load session summary:', error);
        setSessionSummary([]);
      } finally {
        setIsLoadingSessionSummary(false);
      }
    };

    loadInitialData();
  }, []); // ✅ FIXED: No dependencies = no circular issues

  // ✅ FIXED: Session completion useEffect with direct state updates
  const previousCompletedIntervalsRef = useRef(completedIntervals);
  const previousTimerStateRef = useRef(timerState);
  const completionInProgressRef = useRef(false);
  
  useEffect(() => {
    // Prevent multiple simultaneous completions
    if (
      completedIntervals > previousCompletedIntervalsRef.current &&
      previousTimerStateRef.current === 'work' && // Check PREVIOUS timerState
      !completionInProgressRef.current
    ) {
      previousCompletedIntervalsRef.current = completedIntervals;
      completionInProgressRef.current = true;

      const completeWorkSession = async () => {
        try {
          // 1. Complete the session on the backend (only if we have a session)
          if (currentSessionHook?.id) {
            await pomodoroApi.completeSession(currentSessionHook.id, {
              actual_duration: currentSessionHook.work_duration, // Use the session's planned duration
            });
          }

          // 2. Refresh all data immediately
          const [newSessions, newStats, newSummary] = await Promise.all([
            pomodoroApi.getSessions({ limit: 10 }),
            pomodoroApi.getStatistics(),
            pomodoroApi.getSessionSummary(),
          ]);

          setSessions(newSessions);

          setStatistics(newStats);

          setSessionSummary(newSummary);

        } catch (error) {
          console.error('Failed to complete session and refresh data:', error);
        } finally {
          completionInProgressRef.current = false;
        }
      };

      completeWorkSession();
    }
    
    // Update refs for next time
    previousTimerStateRef.current = timerState;
  }, [completedIntervals, timerState, selectedProjectId, setSessionSummary, currentSessionHook]);

  const startTimer = useCallback(async (projectId?: string) => {
    try {
      const currentTimerState = usePomodoroStore.getState().timerState;
      if (currentTimerState === 'idle' || currentTimerState === 'work') {
        const sessionData = {
          learning_project_id: projectId || selectedProjectId || undefined,
          session_type: 'work' as const,
          work_duration: preferences.work_duration, // Planned duration
          break_duration: preferences.break_duration,
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
        work_duration: preferences.work_duration,
        break_duration: preferences.break_duration,
        actual_duration: undefined,
        end_time: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as PomodoroSession);
    }
  }, [preferences, selectedProjectId, startGlobalTimer, startGlobalNextSession]);

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
          const plannedDurationSeconds = currentSessionHook.work_duration * 60;
          actualDurationSeconds = plannedDurationSeconds - storeTimeLeft;
        }
        await pomodoroApi.abandonSession(currentSessionHook.id, {
          actual_duration: Math.max(0, Math.round(actualDurationSeconds / 60)),
          reason: 'User reset timer'
        });
        setCurrentSessionHook(null);
      } catch (error) {
        console.error('Failed to abandon session:', error);
      }
    }
    resetGlobalTimer();
    
    // ✅ FIXED: Direct state updates for immediate response
    try {
      const [newSessions, newStats, newSummary] = await Promise.all([
        pomodoroApi.getSessions({ limit: 10 }),
        pomodoroApi.getStatistics(),
        pomodoroApi.getSessionSummary()
      ]);
      setSessions(newSessions);
      setStatistics(newStats);
      setSessionSummary(newSummary);
    } catch (error) {
      console.error('Failed to refresh data after reset:', error);
    }
  }, [currentSessionHook, resetGlobalTimer]); // ✅ FIXED: Clean dependencies

  const updatePreferencesHook = useCallback(async (newPreferences: Partial<PomodoroPreferences>) => {
    try {
      const updatedPrefs = await pomodoroApi.updatePreferences(newPreferences);
      setPreferences(updatedPrefs);
      setGlobalPreferences({
        workDuration: updatedPrefs.work_duration,
        breakDuration: updatedPrefs.break_duration,
        longBreakDuration: updatedPrefs.long_break_duration,
        longBreakInterval: updatedPrefs.long_break_interval,
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }, [setGlobalPreferences]);

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
            const plannedDurationSeconds = currentSessionHook.work_duration * 60;
            actualDurationSeconds = plannedDurationSeconds - timeLeft; 
        }
        await pomodoroApi.abandonSession(currentSessionHook.id, {
          actual_duration: Math.max(0, Math.round(actualDurationSeconds / 60)),
          reason: 'User abandoned session'
        });
        setCurrentSessionHook(null);
      } catch (error) {
        console.error('Failed to abandon session during explicit abandon call:', error);
      }
    }
    resetGlobalTimer(); 
    
    // ✅ FIXED: Direct state updates for immediate response
    try {
      const [newSessions, newStats, newSummary] = await Promise.all([
        pomodoroApi.getSessions({ limit: 10 }),
        pomodoroApi.getStatistics(),
        pomodoroApi.getSessionSummary()
      ]);
      setSessions(newSessions);
      setStatistics(newStats);
      setSessionSummary(newSummary);
    } catch (error) {
      console.error('Failed to refresh data after abandon:', error);
    }
  }, [currentSessionHook, resetGlobalTimer, timeLeft, isRunning]); // ✅ FIXED: Clean dependencies

  // Expose store actions and hook-specific logic
  return {
    timerState,
    isRunning,
    timeLeft,
    completedIntervals,
    currentSession: currentSessionHook, // Use the hook's version of currentSession
    selectedProjectId,
    preferences,
    isLoadingPreferences,
    sessions,
    isLoadingSessions,
    statistics,
    isLoadingStatistics,
    sessionSummary, // Expose new state
    isLoadingSessionSummary, // Expose new state
    startTimer,
    pauseTimer: pauseTimerHook,
    resumeTimer: resumeTimerHook,
    resetTimer: resetTimerHook,
    startNextSession: startGlobalNextSession, // Expose from store
    updatePreferences: updatePreferencesHook,
    setSelectedProjectId: setSelectedProjectIdHook,
    refreshSessions,
    refreshStatistics,
    abandonSession: abandonSessionHook,
  };
} 