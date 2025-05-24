import { useState, useEffect, useCallback } from 'react';
import { pomodoroApi } from '@/services/api/pomodoro';
import { usePomodoroStore } from '@/store/pomodoroStore';
import type {
  PomodoroPreferences,
  PomodoroSession,
  PomodoroSessionWithProject,
  PomodoroStatistics,
} from '@/services/api/types/pomodoro';

type TimerState = 'idle' | 'work' | 'break' | 'longBreak';

interface UsePomodoroState {
  // Timer state
  timerState: TimerState;
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
  
  // Actions
  startTimer: (projectId?: string) => Promise<void>;
  pauseTimer: () => void;
  resetTimer: () => Promise<void>;
  updatePreferences: (newPreferences: Partial<PomodoroPreferences>) => Promise<void>;
  setSelectedProjectId: (projectId: string | null) => void;
  refreshSessions: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  abandonSession: () => Promise<void>;
}

export function usePomodoro(): UsePomodoroState {
  // Get timer state from global store
  const {
    timerState,
    isRunning,
    timeLeft,
    completedIntervals,
    selectedProjectId,
    setSelectedProjectId: setGlobalSelectedProjectId,
    startTimer: startGlobalTimer,
    pauseTimer: pauseGlobalTimer,
    resetTimer: resetGlobalTimer,
    setPreferences: setGlobalPreferences,
  } = usePomodoroStore();
  
  // Current session (still local since it's API-specific)
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);
  
  // Preferences
  const [preferences, setPreferences] = useState<PomodoroPreferences>({
    work_duration: 25,
    break_duration: 5,
    long_break_duration: 15,
    long_break_interval: 4,
  });
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  
  // Sessions history
  const [sessions, setSessions] = useState<PomodoroSessionWithProject[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  
  // Statistics
  const [statistics, setStatistics] = useState<PomodoroStatistics>({
    total_focus_time: 0,
    completed_sessions: 0,
    total_sessions: 0,
    weekly_goal: 900,
    weekly_progress: 0,
  });
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(true);

  // Load initial data
  useEffect(() => {
    loadPreferences();
    refreshSessions();
    refreshStatistics();
  }, []);

  // Load preferences from API
  const loadPreferences = async () => {
    try {
      setIsLoadingPreferences(true);
      const prefs = await pomodoroApi.getPreferences();
      setPreferences(prefs);
      // Sync preferences with global store
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
  };

  // Refresh sessions list
  const refreshSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      const sessionsData = await pomodoroApi.getSessions({ limit: 10 });
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Refresh statistics
  const refreshStatistics = useCallback(async () => {
    try {
      setIsLoadingStatistics(true);
      const stats = await pomodoroApi.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setIsLoadingStatistics(false);
    }
  }, []);

  // Handle session completion when timer completes
  useEffect(() => {
    // Listen for timer completion to handle API session completion
    if (timeLeft === 0 && currentSession && timerState === 'work') {
      const completeCurrentSession = async () => {
        try {
          const actualDuration = Math.round(currentSession.work_duration);
          await pomodoroApi.completeSession(currentSession.id, { actual_duration: actualDuration });
          setCurrentSession(null);
          // Refresh data after completion
          refreshSessions();
          refreshStatistics();
        } catch (error) {
          console.error('Failed to complete session:', error);
        }
      };
      completeCurrentSession();
    }
  }, [timeLeft, currentSession, timerState, refreshSessions, refreshStatistics]);

  // Start timer
  const startTimer = useCallback(async (projectId?: string) => {
    try {
      // Start a new session if in work mode
      if (timerState === 'idle' || timerState === 'work') {
        const sessionData = {
          learning_project_id: projectId || selectedProjectId || undefined,
          session_type: 'work' as const,
          work_duration: preferences.work_duration,
          break_duration: preferences.break_duration,
        };

        const session = await pomodoroApi.startSession(sessionData);
        setCurrentSession(session);
        
        // Start the global timer with session ID
        startGlobalTimer(session.id, projectId);
      } else {
        // Resume existing timer for breaks
        startGlobalTimer('', projectId);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      // Still allow timer to start locally even if API fails
      startGlobalTimer('fallback-session', projectId);
    }
  }, [timerState, preferences, selectedProjectId, startGlobalTimer]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    pauseGlobalTimer();
  }, [pauseGlobalTimer]);

  // Reset timer
  const resetTimer = useCallback(async () => {
    // Abandon current session if exists
    if (currentSession) {
      try {
        const actualDuration = Math.round((currentSession.work_duration * 60 - timeLeft) / 60);
        await pomodoroApi.abandonSession(currentSession.id, { 
          actual_duration: actualDuration,
          reason: 'User reset timer'
        });
        setCurrentSession(null);
      } catch (error) {
        console.error('Failed to abandon session:', error);
      }
    }

    // Reset global timer
    resetGlobalTimer();

    // Refresh data after reset
    refreshSessions();
    refreshStatistics();
  }, [currentSession, timeLeft, resetGlobalTimer, refreshSessions, refreshStatistics]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<PomodoroPreferences>) => {
    try {
      const updatedPrefs = await pomodoroApi.updatePreferences(newPreferences);
      setPreferences(updatedPrefs);
      
      // Update global store preferences
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

  // Set selected project ID
  const setSelectedProjectId = useCallback((projectId: string | null) => {
    setGlobalSelectedProjectId(projectId);
  }, [setGlobalSelectedProjectId]);

  // Refresh projects list
  const refreshProjects = useCallback(async () => {
    try {
      // This is a no-op since we don't store projects in this hook
      // The ProjectSelector component handles its own state
    } catch (error) {
      console.error('Failed to refresh projects:', error);
    }
  }, []);

  // Abandon current session
  const abandonSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      // Calculate actual duration in minutes
      const totalDuration = currentSession.work_duration * 60; // Convert to seconds
      const actualDuration = Math.round((totalDuration - timeLeft) / 60); // Convert back to minutes
      
      await pomodoroApi.abandonSession(currentSession.id, { 
        actual_duration: actualDuration,
        reason: 'User abandoned session'
      });
      setCurrentSession(null);
      
      // Reset global timer
      resetGlobalTimer();
      
      // Refresh data after abandonment
      refreshSessions();
      refreshStatistics();
    } catch (error) {
      console.error('Failed to abandon session:', error);
      throw error;
    }
  }, [currentSession, timeLeft, resetGlobalTimer, refreshSessions, refreshStatistics]);

  return {
    // Timer state (from global store)
    timerState,
    isRunning,
    timeLeft,
    completedIntervals,
    
    // Current session
    currentSession,
    selectedProjectId,
    
    // Preferences
    preferences,
    isLoadingPreferences,
    
    // Sessions history
    sessions,
    isLoadingSessions,
    
    // Statistics
    statistics,
    isLoadingStatistics,
    
    // Actions
    startTimer,
    pauseTimer,
    resetTimer,
    updatePreferences,
    setSelectedProjectId,
    refreshSessions,
    refreshStatistics,
    refreshProjects,
    abandonSession,
  };
} 