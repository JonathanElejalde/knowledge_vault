import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TimerState = 'idle' | 'work' | 'break' | 'longBreak';

interface PomodoroStoreState {
  // Timer state
  timerState: TimerState;
  isRunning: boolean;
  timeLeft: number; // in seconds
  completedIntervals: number;
  startTime: number | null; // timestamp when timer started, for accuracy
  
  // Session info
  currentSessionId: string | null;
  selectedProjectId: string | null;
  
  // Timer preferences (will be synced from the hook)
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number;
  
  // UI state
  showGlobalTimer: boolean; // Whether to show the persistent timer bar
  
  // Actions
  startTimer: (sessionId: string, projectId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  completeInterval: () => void;
  updateTimeLeft: (time: number) => void;
  setPreferences: (prefs: {
    workDuration: number;
    breakDuration: number;
    longBreakDuration: number;
    longBreakInterval: number;
  }) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  setShowGlobalTimer: (show: boolean) => void;
  
  // Internal timer management
  _intervalId: NodeJS.Timeout | null;
  _startInterval: () => void;
  _clearInterval: () => void;
}

export const usePomodoroStore = create<PomodoroStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      timerState: 'idle',
      isRunning: false,
      timeLeft: 25 * 60, // 25 minutes default
      completedIntervals: 0,
      startTime: null,
      currentSessionId: null,
      selectedProjectId: null,
      workDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      showGlobalTimer: true,
      _intervalId: null,

      // Actions
      startTimer: (sessionId: string, projectId?: string) => {
        const state = get();
        const now = Date.now();
        
        set({
          isRunning: true,
          startTime: now,
          currentSessionId: sessionId,
          selectedProjectId: projectId || state.selectedProjectId,
          timerState: state.timerState === 'idle' ? 'work' : state.timerState,
          timeLeft: state.timerState === 'idle' ? state.workDuration * 60 : state.timeLeft,
        });
        
        state._startInterval();
      },

      pauseTimer: () => {
        const state = get();
        set({ isRunning: false, startTime: null });
        state._clearInterval();
      },

      resumeTimer: () => {
        const state = get();
        const now = Date.now();
        set({ isRunning: true, startTime: now });
        state._startInterval();
      },

      resetTimer: () => {
        const state = get();
        state._clearInterval();
        set({
          timerState: 'idle',
          isRunning: false,
          timeLeft: state.workDuration * 60,
          completedIntervals: 0,
          startTime: null,
          currentSessionId: null,
        });
      },

      completeInterval: () => {
        const state = get();
        state._clearInterval();
        
        if (state.timerState === 'work') {
          const newCompletedIntervals = state.completedIntervals + 1;
          const isLongBreak = newCompletedIntervals % state.longBreakInterval === 0;
          
          set({
            completedIntervals: newCompletedIntervals,
            timerState: isLongBreak ? 'longBreak' : 'break',
            timeLeft: isLongBreak ? state.longBreakDuration * 60 : state.breakDuration * 60,
            isRunning: true,
            startTime: Date.now(),
          });
        } else {
          // Break completed, back to work
          set({
            timerState: 'work',
            timeLeft: state.workDuration * 60,
            isRunning: true,
            startTime: Date.now(),
          });
        }
        
        state._startInterval();
      },

      updateTimeLeft: (time: number) => {
        set({ timeLeft: Math.max(0, time) });
      },

      setPreferences: (prefs) => {
        const state = get();
        set({
          workDuration: prefs.workDuration,
          breakDuration: prefs.breakDuration,
          longBreakDuration: prefs.longBreakDuration,
          longBreakInterval: prefs.longBreakInterval,
          // Update timeLeft if timer is idle
          timeLeft: state.timerState === 'idle' ? prefs.workDuration * 60 : state.timeLeft,
        });
      },

      setSelectedProjectId: (projectId) => {
        set({ selectedProjectId: projectId });
      },

      setShowGlobalTimer: (show) => {
        set({ showGlobalTimer: show });
      },

      // Internal timer management
      _startInterval: () => {
        const state = get();
        if (state._intervalId) {
          clearInterval(state._intervalId);
        }

        const intervalId = setInterval(() => {
          const currentState = get();
          if (!currentState.isRunning) return;

          // Use timestamp-based calculation for accuracy
          if (currentState.startTime) {
            const elapsed = Math.floor((Date.now() - currentState.startTime) / 1000);
            const originalTime = currentState.timerState === 'work' 
              ? currentState.workDuration * 60
              : currentState.timerState === 'break'
              ? currentState.breakDuration * 60
              : currentState.longBreakDuration * 60;
            
            const newTimeLeft = Math.max(0, originalTime - elapsed);
            
            if (newTimeLeft <= 0) {
              // Timer completed
              currentState.completeInterval();
            } else {
              set({ timeLeft: newTimeLeft });
            }
          } else {
            // Fallback to simple countdown if no startTime
            const newTimeLeft = currentState.timeLeft - 1;
            if (newTimeLeft <= 0) {
              currentState.completeInterval();
            } else {
              set({ timeLeft: newTimeLeft });
            }
          }
        }, 1000);

        set({ _intervalId: intervalId });
      },

      _clearInterval: () => {
        const state = get();
        if (state._intervalId) {
          clearInterval(state._intervalId);
          set({ _intervalId: null });
        }
      },
    }),
    {
      name: 'pomodoro-timer-store',
      // Only persist essential state, not the interval
      partialize: (state) => ({
        timerState: state.timerState,
        isRunning: state.isRunning,
        timeLeft: state.timeLeft,
        completedIntervals: state.completedIntervals,
        startTime: state.startTime,
        currentSessionId: state.currentSessionId,
        selectedProjectId: state.selectedProjectId,
        workDuration: state.workDuration,
        breakDuration: state.breakDuration,
        longBreakDuration: state.longBreakDuration,
        longBreakInterval: state.longBreakInterval,
        showGlobalTimer: state.showGlobalTimer,
      }),
      // Resume timer on hydration if it was running
      onRehydrateStorage: () => (state) => {
        if (state?.isRunning) {
          // Resume the interval after rehydration
          state._startInterval();
        }
      },
    }
  )
); 