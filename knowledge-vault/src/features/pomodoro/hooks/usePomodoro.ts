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

  // Session Summary (New)
  sessionSummary: PomodoroSessionSummary[] | null;
  isLoadingSessionSummary: boolean;
  refreshSessionSummary: () => Promise<void>;

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
  // refreshProjects: () => Promise<void>; // This was a no-op, can be removed if not used by UI
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

  // New state for session summary
  const [sessionSummary, setSessionSummary] = useState<PomodoroSessionSummary[] | null>(null);
  const [isLoadingSessionSummary, setIsLoadingSessionSummary] = useState(true);

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

  const refreshSessionSummary = useCallback(async () => {
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
  }, []);

  const loadPreferences = async () => {
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
  }; // Not a useCallback as it doesn't depend on other reactive values from the hook scope

  // Initial data load useEffect
  useEffect(() => {
    loadPreferences();
    refreshSessions();
    refreshStatistics();
    refreshSessionSummary();
  }, [refreshSessions, refreshStatistics, refreshSessionSummary]); // Now a_functions are defined

  // NEW useEffect to complete session based on completedIntervals change
  const previousCompletedIntervalsRef = useRef(completedIntervals);
  useEffect(() => {
    // Check if completedIntervals has actually increased
    if (completedIntervals > previousCompletedIntervalsRef.current) {
      if (currentSessionHook && currentSessionHook.session_type === 'work') {
        console.log(`Pomodoro: Work session ${currentSessionHook.id} identified for completion via completedIntervals increment.`);
        const completeWorkSession = async () => {
          try {
            const actualDurationMinutes = preferences.work_duration;
            await pomodoroApi.completeSession(currentSessionHook.id, { actual_duration: actualDurationMinutes });
            console.log(`Pomodoro: Successfully completed session ${currentSessionHook.id} on backend.`);
            setCurrentSessionHook(null); // Clear the locally tracked API session
            refreshSessions();
            refreshStatistics();
            refreshSessionSummary();
          } catch (error) {
            console.error(`Pomodoro: Failed to complete session ${currentSessionHook.id} on backend:`, error);
            // Decide if setCurrentSessionHook(null) should still be called or if retry logic is needed.
            // For now, if API fails, the local session hook might remain, potentially leading to issues.
            // However, nulling it out might also hide the problem if the user tries to start another.
            // Let's leave it as is: currentSessionHook is nulled on successful API call.
          }
        };
        completeWorkSession();
      } else if (currentSessionHook && currentSessionHook.session_type !== 'work') {
        // This case should ideally not happen if completedIntervals only increments for work sessions.
        console.warn('Pomodoro: completedIntervals increased, but currentSessionHook is not a work session.', currentSessionHook);
      } else if (!currentSessionHook) {
        console.warn('Pomodoro: completedIntervals increased, but no currentSessionHook is set. This might indicate a previous error or state mismatch.');
      }
    }
    // Update the ref to the current value for the next render
    previousCompletedIntervalsRef.current = completedIntervals;
  }, [completedIntervals, currentSessionHook, preferences.work_duration, refreshSessions, refreshStatistics, refreshSessionSummary]);

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
    refreshSessions(); // Refresh data after reset
    refreshStatistics();
    refreshSessionSummary();
  }, [currentSessionHook, resetGlobalTimer, refreshSessions, refreshStatistics, refreshSessionSummary]);

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
    refreshSessions();
    refreshStatistics();
    refreshSessionSummary();
  }, [currentSessionHook, resetGlobalTimer, refreshSessions, refreshStatistics, timeLeft, isRunning, refreshSessionSummary]);

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
    refreshSessionSummary, // Expose new function
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