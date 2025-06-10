import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TimerState = 'idle' | 'work' | 'break' | 'longBreak';

export interface PomodoroStoreState {
  // Timer state
  timerState: TimerState;
  isRunning: boolean;
  timeLeft: number; // in seconds
  completedIntervals: number;
  startTime: number | null; // timestamp when timer started, for accuracy
  resumeTimeLeft: number | null; // time left when resuming from pause
  
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
  startNextSession: () => void;
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
  _playSound: (soundFile: string) => void;
  
  // Add cleanup function for logout
  clearSessionState: () => void;
}

const playSoundGlobally = (soundFile: string) => {
  try {
    const audio = new Audio(soundFile);
    audio.play().catch(error => console.warn('Audio play failed:', error));
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
};

// Default preferences - will be overridden by backend preferences when available
const DEFAULT_PREFERENCES = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
};

export const usePomodoroStore = create<PomodoroStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      timerState: 'idle',
      isRunning: false,
      timeLeft: DEFAULT_PREFERENCES.workDuration * 60,
      completedIntervals: 0,
      startTime: null,
      resumeTimeLeft: null,
      currentSessionId: null,
      selectedProjectId: null,
      // PHASE 1: Use defaults, will be set by usePomodoro hook when preferences load
      workDuration: DEFAULT_PREFERENCES.workDuration,
      breakDuration: DEFAULT_PREFERENCES.breakDuration,
      longBreakDuration: DEFAULT_PREFERENCES.longBreakDuration,
      longBreakInterval: DEFAULT_PREFERENCES.longBreakInterval,
      showGlobalTimer: true,
      _intervalId: null,

      // Actions
      startTimer: (sessionId: string, projectId?: string) => {
        const state = get();
        const now = Date.now();
        
        set({
          isRunning: true,
          startTime: now,
          resumeTimeLeft: null,
          currentSessionId: sessionId,
          selectedProjectId: projectId || state.selectedProjectId,
          timerState: state.timerState === 'idle' ? 'work' : state.timerState,
          timeLeft: state.timerState === 'idle' ? state.workDuration * 60 : state.timeLeft,
        });
        
        state._startInterval();
      },

      pauseTimer: () => {
        const state = get();
        set({ 
          isRunning: false, 
          startTime: null,
          resumeTimeLeft: null, // Clear when pausing
        });
        state._clearInterval();
      },

      resumeTimer: () => {
        const state = get();
        const now = Date.now();
        // When resuming, store the current timeLeft as our baseline
        set({ 
          isRunning: true, 
          startTime: now,
          resumeTimeLeft: state.timeLeft, // Store current time when resuming
        });
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
          resumeTimeLeft: null,
          currentSessionId: null,
        });
      },

      completeInterval: () => {
        const state = get();
        
        // Prevent multiple calls in rapid succession (important for background tab scenarios)
        if (state.timeLeft > 1) {
          return;
        }

        state._clearInterval();

        if (state.timerState === 'work') {
          state._playSound('/sounds/positive-notification.wav');

          const newCompletedIntervals = state.completedIntervals + 1;
          const isLongBreak = newCompletedIntervals % state.longBreakInterval === 0;
          
          set({
            completedIntervals: newCompletedIntervals,
            timerState: isLongBreak ? 'longBreak' : 'break',
            timeLeft: isLongBreak ? state.longBreakDuration * 60 : state.breakDuration * 60,
            isRunning: true,
            startTime: Date.now(),
          });
          
          state._startInterval();

        } else if (state.timerState === 'break' || state.timerState === 'longBreak') {
          state._playSound('/sounds/bell-notification.wav');
          
          set({
            timerState: 'idle',
            timeLeft: state.workDuration * 60,
            isRunning: false,
            startTime: null,
            currentSessionId: null,
          });
        }
      },

      startNextSession: () => {
        const state = get();
        if (state.isRunning) return;

        set({
          isRunning: true,
          startTime: Date.now(),
        });
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
          timeLeft: state.timerState === 'idle' ? prefs.workDuration * 60 : state.timeLeft,
        });
      },

      setSelectedProjectId: (projectId) => {
        set({ selectedProjectId: projectId });
      },

      setShowGlobalTimer: (show) => {
        set({ showGlobalTimer: show });
      },

      _playSound: (soundFile: string) => {
        playSoundGlobally(soundFile);
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

          // Always use timestamp-based calculation for accuracy (especially important for background tabs)
          let newTimeLeft: number;
          
          if (currentState.startTime) {
            const elapsed = Math.floor((Date.now() - currentState.startTime) / 1000);
            
            // Use resumeTimeLeft if available (when resuming), otherwise calculate from full duration
            const baselineTime = currentState.resumeTimeLeft !== null 
              ? currentState.resumeTimeLeft
              : currentState.timerState === 'work' ? currentState.workDuration * 60 :
                currentState.timerState === 'break' ? currentState.breakDuration * 60 :
                currentState.timerState === 'longBreak' ? currentState.longBreakDuration * 60 :
                currentState.timeLeft;
            
            newTimeLeft = Math.max(0, baselineTime - elapsed);
          } else {
            // Fallback: if no startTime, fall back to simple countdown (should rarely happen)
            newTimeLeft = Math.max(0, currentState.timeLeft - 1);
          }
          
          if (newTimeLeft <= 0) {
            // Set timeLeft to 0 before calling completeInterval to prevent race conditions
            set({ timeLeft: 0 });
            currentState.completeInterval();
          } else {
            set({ timeLeft: newTimeLeft });
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

      // Add cleanup function for logout
      clearSessionState: () => {
        const state = get();
        state._clearInterval();
        set({
          // Reset active timer state
          timerState: 'idle',
          isRunning: false,
          timeLeft: state.workDuration * 60, // Reset to preference default
          completedIntervals: 0,
          startTime: null,
          resumeTimeLeft: null,
          currentSessionId: null,
          selectedProjectId: null,
          // Keep preferences and UI settings
          // workDuration, breakDuration, etc. stay as they are
          // showGlobalTimer stays as it is
        });
      },
    }),
    {
      name: 'pomodoro-timer-store',
      partialize: (state) => ({
        // ❌ PHASE 1: Remove preferences from persistence (they come from backend)
        // workDuration: state.workDuration,
        // breakDuration: state.breakDuration,
        // longBreakDuration: state.longBreakDuration,
        // longBreakInterval: state.longBreakInterval,
        
        // ❌ PHASE 1: Remove active timer state from persistence  
        // timerState: state.timerState,
        // isRunning: state.isRunning,
        // timeLeft: state.timeLeft,
        // completedIntervals: state.completedIntervals,
        // startTime: state.startTime,
        // resumeTimeLeft: state.resumeTimeLeft,
        // currentSessionId: state.currentSessionId,
        // selectedProjectId: state.selectedProjectId,
        
        // ✅ PHASE 1: Only persist UI preferences
        showGlobalTimer: state.showGlobalTimer,
      }),
      // ❌ PHASE 1: Remove auto-restart on app load
      // onRehydrateStorage: () => (state) => {
      //   if (state?.isRunning) {
      //     state._startInterval();
      //   }
      // },
    }
  )
); 

// PHASE 1: Test helper function - remove after testing
export const testPhase1Changes = () => {
  console.log('🧪 TESTING PHASE 1 CHANGES');
  
  const state = usePomodoroStore.getState();
  console.log('📊 Current store state:', {
    timerState: state.timerState,
    isRunning: state.isRunning,
    timeLeft: state.timeLeft,
    currentSessionId: state.currentSessionId,
    showGlobalTimer: state.showGlobalTimer,
  });
  
  // Check localStorage to see what's persisted
  const persistedData = localStorage.getItem('pomodoro-timer-store');
  console.log('💾 Persisted data:', persistedData ? JSON.parse(persistedData) : 'No data');
  
  // Test cleanup function
  console.log('🧹 Testing cleanup function...');
  state.clearSessionState();
  
  const stateAfterCleanup = usePomodoroStore.getState();
  console.log('📊 State after cleanup:', {
    timerState: stateAfterCleanup.timerState,
    isRunning: stateAfterCleanup.isRunning,
    timeLeft: stateAfterCleanup.timeLeft,
    currentSessionId: stateAfterCleanup.currentSessionId,
    showGlobalTimer: stateAfterCleanup.showGlobalTimer, // Should remain unchanged
  });
  
  console.log('✅ Phase 1 test complete');
}; 