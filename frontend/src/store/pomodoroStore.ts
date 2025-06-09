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
}

const playSoundGlobally = (soundFile: string) => {
  try {
    const audio = new Audio(soundFile);
    audio.play().catch(error => console.warn('Audio play failed:', error));
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
};

export const usePomodoroStore = create<PomodoroStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      timerState: 'idle',
      isRunning: false,
      timeLeft: 25 * 60,
      completedIntervals: 0,
      startTime: null,
      resumeTimeLeft: null,
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
        // DEBUG_LOGS_START
        console.log('🎯 COMPLETE INTERVAL CALLED:', {
          currentTimerState: state.timerState,
          currentCompletedIntervals: state.completedIntervals,
          currentSessionId: state.currentSessionId,
          timeLeft: state.timeLeft,
          timestamp: new Date().toISOString()
        });
        // DEBUG_LOGS_END

        state._clearInterval();

        if (state.timerState === 'work') {
          // DEBUG_LOGS_START
          console.log('🎯 COMPLETING WORK INTERVAL');
          // DEBUG_LOGS_END
          state._playSound('/sounds/positive-notification.wav');

          const newCompletedIntervals = state.completedIntervals + 1;
          const isLongBreak = newCompletedIntervals % state.longBreakInterval === 0;
          
          // DEBUG_LOGS_START
          console.log('🎯 WORK INTERVAL COMPLETED:', {
            oldCompletedIntervals: state.completedIntervals,
            newCompletedIntervals,
            isLongBreak,
            sessionId: state.currentSessionId,
            timestamp: new Date().toISOString()
          });
          // DEBUG_LOGS_END
          
          set({
            completedIntervals: newCompletedIntervals,
            timerState: isLongBreak ? 'longBreak' : 'break',
            timeLeft: isLongBreak ? state.longBreakDuration * 60 : state.breakDuration * 60,
            isRunning: true,
            startTime: Date.now(),
          });
          
          state._startInterval();

        } else if (state.timerState === 'break' || state.timerState === 'longBreak') {
          // DEBUG_LOGS_START
          console.log('🎯 COMPLETING BREAK INTERVAL:', state.timerState);
          // DEBUG_LOGS_END
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

          if (currentState.startTime) {
            const elapsed = Math.floor((Date.now() - currentState.startTime) / 1000);
            
            // Use resumeTimeLeft if available (when resuming), otherwise calculate from full duration
            const baselineTime = currentState.resumeTimeLeft !== null 
              ? currentState.resumeTimeLeft
              : currentState.timerState === 'work' ? currentState.workDuration * 60 :
                currentState.timerState === 'break' ? currentState.breakDuration * 60 :
                currentState.timerState === 'longBreak' ? currentState.longBreakDuration * 60 :
                currentState.timeLeft;
            
            const newTimeLeft = Math.max(0, baselineTime - elapsed);
            
            // DEBUG_LOGS_START
            // Log when we're close to completion
            if (newTimeLeft <= 5 && newTimeLeft > 0) {
              console.log('⏰ TIMER COUNTDOWN:', {
                timeLeft: newTimeLeft,
                timerState: currentState.timerState,
                elapsed,
                baselineTime,
                sessionId: currentState.currentSessionId,
                timestamp: new Date().toISOString()
              });
            }
            // DEBUG_LOGS_END
            
            if (newTimeLeft <= 0) {
              // DEBUG_LOGS_START
              console.log('⏰ TIMER REACHED ZERO - CALLING COMPLETE INTERVAL:', {
                timerState: currentState.timerState,
                sessionId: currentState.currentSessionId,
                elapsed,
                baselineTime,
                timestamp: new Date().toISOString()
              });
              // DEBUG_LOGS_END
              currentState.completeInterval();
            } else {
              set({ timeLeft: newTimeLeft });
            }
          } else {
            const newTimeLeft = currentState.timeLeft - 1;
            
            // DEBUG_LOGS_START
            // Log when we're close to completion
            if (newTimeLeft <= 5 && newTimeLeft > 0) {
              console.log('⏰ TIMER COUNTDOWN (fallback):', {
                timeLeft: newTimeLeft,
                timerState: currentState.timerState,
                sessionId: currentState.currentSessionId,
                timestamp: new Date().toISOString()
              });
            }
            // DEBUG_LOGS_END
            
            if (newTimeLeft <= 0) {
              // DEBUG_LOGS_START
              console.log('⏰ TIMER REACHED ZERO (fallback) - CALLING COMPLETE INTERVAL:', {
                timerState: currentState.timerState,
                sessionId: currentState.currentSessionId,
                timestamp: new Date().toISOString()
              });
              // DEBUG_LOGS_END
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
      partialize: (state) => ({
        timerState: state.timerState,
        isRunning: state.isRunning,
        timeLeft: state.timeLeft,
        completedIntervals: state.completedIntervals,
        startTime: state.startTime,
        resumeTimeLeft: state.resumeTimeLeft,
        currentSessionId: state.currentSessionId,
        selectedProjectId: state.selectedProjectId,
        workDuration: state.workDuration,
        breakDuration: state.breakDuration,
        longBreakDuration: state.longBreakDuration,
        longBreakInterval: state.longBreakInterval,
        showGlobalTimer: state.showGlobalTimer,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.isRunning) {
          state._startInterval();
        }
      },
    }
  )
); 