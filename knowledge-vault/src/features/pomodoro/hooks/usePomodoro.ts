import { useState, useEffect, useCallback, useRef } from 'react';
import { pomodoroApi } from '@/services/api/pomodoro';
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
  // Timer state
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [completedIntervals, setCompletedIntervals] = useState(0);
  
  // Current session
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
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
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      setTimeLeft(prefs.work_duration * 60);
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

  // Timer completion handler
  const handleTimerComplete = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Complete current session if exists
    if (currentSession) {
      try {
        const actualDuration = Math.round((currentSession.work_duration * 60 - timeLeft) / 60);
        await pomodoroApi.completeSession(currentSession.id, { actual_duration: actualDuration });
        setCurrentSession(null);
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    }

    if (timerState === 'work') {
      const newCompletedIntervals = completedIntervals + 1;
      setCompletedIntervals(newCompletedIntervals);

      if (newCompletedIntervals % preferences.long_break_interval === 0) {
        setTimerState('longBreak');
        setTimeLeft(preferences.long_break_duration * 60);
      } else {
        setTimerState('break');
        setTimeLeft(preferences.break_duration * 60);
      }
    } else {
      setTimerState('work');
      setTimeLeft(preferences.work_duration * 60);
    }

    // Refresh data after completion
    refreshSessions();
    refreshStatistics();
  }, [timerState, completedIntervals, preferences, currentSession, timeLeft, refreshSessions, refreshStatistics]);

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, handleTimerComplete]);

  // Start timer
  const startTimer = useCallback(async (projectId?: string) => {
    try {
      if (timerState === 'idle') {
        setTimerState('work');
        if (timeLeft !== preferences.work_duration * 60) {
          setTimeLeft(preferences.work_duration * 60);
        }
      }

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
      }

      setIsRunning(true);
    } catch (error) {
      console.error('Failed to start session:', error);
      // Still allow timer to start locally even if API fails
      setIsRunning(true);
    }
  }, [timerState, timeLeft, preferences, selectedProjectId]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  // Reset timer
  const resetTimer = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRunning(false);

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

    setTimerState('idle');
    setTimeLeft(preferences.work_duration * 60);
    setCompletedIntervals(0);

    // Refresh data after reset
    refreshSessions();
    refreshStatistics();
  }, [currentSession, timeLeft, preferences.work_duration, refreshSessions, refreshStatistics]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<PomodoroPreferences>) => {
    try {
      const updatedPrefs = await pomodoroApi.updatePreferences(newPreferences);
      setPreferences(updatedPrefs);
      
      // Reset timer to use new preferences
      if (timerState === 'idle') {
        setTimeLeft(updatedPrefs.work_duration * 60);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }, [timerState]);

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
      setTimerState('idle');
      setTimeLeft(preferences.work_duration * 60);
      setCompletedIntervals(0);
      setIsRunning(false);
      
      // Refresh data after abandonment
      refreshSessions();
      refreshStatistics();
    } catch (error) {
      console.error('Failed to abandon session:', error);
      throw error;
    }
  }, [currentSession, timeLeft, preferences, refreshSessions, refreshStatistics]);

  return {
    // Timer state
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