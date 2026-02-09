import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TimerState = 'idle' | 'work' | 'break' | 'longBreak';

export interface PomodoroSessionData {
  sessionId: string;
  timerState: TimerState;
  startTime: number;
  duration: number; // in seconds
  pausedTime: number; // total paused time in ms
  completedIntervals: number;
  selectedProjectId: string | null;
  lastHeartbeat: number;
}

export interface PomodoroStoreState {
  // Timer state - NOW PERSISTED for page refresh
  timerState: TimerState;
  isRunning: boolean;
  timeLeft: number; // in seconds
  completedIntervals: number;
  startTime: number | null; // timestamp when timer started, for accuracy
  pausedTime: number; // total time spent paused in ms
  
  // Session info - NOW PERSISTED
  currentSessionId: string | null;
  selectedProjectId: string | null;
  lastHeartbeat: number;
  
  // Timer preferences (will be synced from the hook)
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number;
  
  // UI state
  showGlobalTimer: boolean; // Whether to show the persistent timer bar
  
  // Actions
  startTimer: (sessionId: string, projectId?: string, startedAtMs?: number) => void;
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
  
  // Session recovery and validation
  validateSession: () => boolean;
  recoverSession: () => void;
  updateHeartbeat: () => void;
  
  // Internal timer management
  _intervalId: NodeJS.Timeout | null;
  _startInterval: () => void;
  _clearInterval: () => void;
  _playSound: (soundFile: string) => void;
  
  // Cleanup function for logout
  clearSessionState: () => void;
}

// Enhanced sound playing with background tab support
const playSoundGlobally = (soundFile: string) => {
  const playSound = async () => {
    try {
      // Strategy 1: Try standard Audio API first
      const audio = new Audio(soundFile);
      audio.volume = 0.8; // Slightly higher volume for background tabs
      
      // Preload the audio
      audio.preload = 'auto';
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        return true; // Success
      }
    } catch (error) {
      console.warn('🔇 Standard audio failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Strategy 2: Try with user gesture simulation (for background tabs)
    try {
      const audio = new Audio(soundFile);
      audio.volume = 0.8;
      
      // Force play even in background (some browsers allow this)
      audio.muted = false;
      audio.currentTime = 0;
      
      await audio.play();
      return true;
    } catch (error) {
      console.warn('🔇 Background audio failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    return false; // All audio strategies failed
  };

  // Execute sound playing
  playSound().then(success => {
    if (!success) {
      // Strategy 3: Show persistent notification with sound description
      const isWorkComplete = soundFile.includes('positive');
      const title = isWorkComplete ? '🍅 Pomodoro Complete!' : '☕ Break Time Over!';
      const body = isWorkComplete 
        ? 'Great work! Time for a break.' 
        : 'Break finished. Ready for another Pomodoro?';
      
      // Show notification regardless of permission (fallback UI)
      showNotificationFallback(title, body);
      
      // Also try browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: body,
          icon: '/app_logo.png',
          tag: 'pomodoro-timer', // Replace previous notifications
          requireInteraction: true, // Keep visible until user interacts
          silent: false, // Try to play system sound
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
      }
    }
  });
};

// Fallback notification system for when audio fails
const showNotificationFallback = (title: string, body: string) => {
  // Check if page is visible
  const isPageVisible = !document.hidden;
  
  if (!isPageVisible) {
    // Try to focus the tab/window to get user attention
    if (window.focus) {
      window.focus();
    }
    
    // Change page title to get attention
    const originalTitle = document.title;
    let flashCount = 0;
    const flashTitle = () => {
      if (flashCount < 6) { // Flash 3 times
        document.title = flashCount % 2 === 0 ? '🔔 TIMER DONE!' : originalTitle;
        flashCount++;
        setTimeout(flashTitle, 1000);
      } else {
        document.title = originalTitle;
      }
    };
    flashTitle();
  }
  
  // Always log the completion for console monitoring
  console.log(`%c${title}`, 'font-size: 16px; font-weight: bold; color: #4CAF50', body);
};

// Enhanced notification permission request
const requestNotificationPermission = () => {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // Test notification
          new Notification('🍅 Pomodoro Timer Ready', {
            body: 'You\'ll now receive notifications when sessions complete, even in background tabs.',
            icon: '/app_logo.png',
            tag: 'pomodoro-setup',
          });
        }
      });
    } else if (Notification.permission === 'denied') {
      console.warn('🔔 Notifications blocked. Audio may not work in background tabs.');
    }
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
      pausedTime: 0,
      currentSessionId: null,
      selectedProjectId: null,
      lastHeartbeat: Date.now(),
      
      // Timer preferences
      workDuration: DEFAULT_PREFERENCES.workDuration,
      breakDuration: DEFAULT_PREFERENCES.breakDuration,
      longBreakDuration: DEFAULT_PREFERENCES.longBreakDuration,
      longBreakInterval: DEFAULT_PREFERENCES.longBreakInterval,
      showGlobalTimer: true,
      _intervalId: null,

      // Actions
      startTimer: (sessionId: string, projectId?: string, startedAtMs?: number) => {
        const state = get();
        const now = Number.isFinite(startedAtMs) ? Number(startedAtMs) : Date.now();
        
        // Request notification permission early
        requestNotificationPermission();
        
        set({
          isRunning: true,
          startTime: now,
          pausedTime: 0,
          currentSessionId: sessionId,
          selectedProjectId: projectId || state.selectedProjectId,
          timerState: state.timerState === 'idle' ? 'work' : state.timerState,
          timeLeft: state.timerState === 'idle' ? state.workDuration * 60 : state.timeLeft,
          lastHeartbeat: now,
        });
        
        state._startInterval();
      },

      pauseTimer: () => {
        const state = get();
        if (!state.isRunning) return;
        
        // Calculate additional paused time
        const now = Date.now();
        const currentSessionTime = state.startTime ? now - state.startTime : 0;
        
        set({ 
          isRunning: false,
          pausedTime: state.pausedTime + (now - (state.lastHeartbeat || now)),
          lastHeartbeat: now,
        });
        state._clearInterval();
      },

      resumeTimer: () => {
        const state = get();
        if (state.isRunning) return;
        
        const now = Date.now();
        set({ 
          isRunning: true,
          lastHeartbeat: now,
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
          pausedTime: 0,
          currentSessionId: null,
          lastHeartbeat: Date.now(),
        });
      },

      completeInterval: () => {
        const state = get();
        
        // Prevent multiple calls
        if (state.timeLeft > 1) return;

        state._clearInterval();
        const now = Date.now();

        if (state.timerState === 'work') {
          // Work session completed
          state._playSound('/sounds/positive-notification.wav');

          const newCompletedIntervals = state.completedIntervals + 1;
          const isLongBreak = newCompletedIntervals % state.longBreakInterval === 0;
          
          set({
            completedIntervals: newCompletedIntervals,
            timerState: isLongBreak ? 'longBreak' : 'break',
            timeLeft: isLongBreak ? state.longBreakDuration * 60 : state.breakDuration * 60,
            isRunning: true,
            startTime: now,
            pausedTime: 0,
            lastHeartbeat: now,
          });
          
          // Auto-start break
          state._startInterval();

        } else if (state.timerState === 'break' || state.timerState === 'longBreak') {
          // Break completed
          state._playSound('/sounds/bell-notification.wav');
          
          set({
            timerState: 'idle',
            timeLeft: state.workDuration * 60,
            isRunning: false,
            startTime: null,
            pausedTime: 0,
            currentSessionId: null,
            lastHeartbeat: now,
          });
        }
      },

      updateTimeLeft: (time: number) => {
        set({ 
          timeLeft: Math.max(0, time),
          lastHeartbeat: Date.now(),
        });
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

      // Session validation and recovery
      validateSession: () => {
        const state = get();
        if (!state.currentSessionId || !state.startTime) return false;
        
        const now = Date.now();
        const timeSinceHeartbeat = now - state.lastHeartbeat;
        const maxValidTime = 15 * 60 * 1000; // 15 minutes
        
        return timeSinceHeartbeat < maxValidTime;
      },

      recoverSession: () => {
        const state = get();
        if (!state.validateSession()) {
          console.log('🔄 Session invalid, clearing state');
          state.clearSessionState();
          return;
        }
        
        if (!state.startTime) return;
        
        const now = Date.now();
        const totalElapsed = Math.floor((now - state.startTime - state.pausedTime) / 1000);
        const expectedDuration = state.timerState === 'work' ? state.workDuration * 60 :
                               state.timerState === 'break' ? state.breakDuration * 60 :
                               state.longBreakDuration * 60;
        
        if (totalElapsed >= expectedDuration) {
          // Timer should have completed
          console.log('🎯 Timer completed while away');
          set({ timeLeft: 0 });
          state.completeInterval();
        } else {
          // Update time left and restart if was running
          const newTimeLeft = Math.max(0, expectedDuration - totalElapsed);
          set({ 
            timeLeft: newTimeLeft,
            lastHeartbeat: now,
          });
          
          if (state.isRunning) {
            console.log('⏰ Recovering running timer');
            state._startInterval();
          }
        }
      },

      updateHeartbeat: () => {
        set({ lastHeartbeat: Date.now() });
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
          if (!currentState.isRunning || !currentState.startTime) return;

          // Timestamp-based calculation for accuracy
          const now = Date.now();
          const totalElapsed = Math.floor((now - currentState.startTime - currentState.pausedTime) / 1000);
          
          const expectedDuration = currentState.timerState === 'work' ? currentState.workDuration * 60 :
                                 currentState.timerState === 'break' ? currentState.breakDuration * 60 :
                                 currentState.longBreakDuration * 60;
          
          const newTimeLeft = Math.max(0, expectedDuration - totalElapsed);
          
          // Update heartbeat every ~10 seconds
          if (now - currentState.lastHeartbeat > 10000) {
            currentState.updateHeartbeat();
          }
          
          if (newTimeLeft <= 0) {
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

      // Cleanup function for logout
      clearSessionState: () => {
        const state = get();
        state._clearInterval();
        set({
          timerState: 'idle',
          isRunning: false,
          timeLeft: state.workDuration * 60,
          completedIntervals: 0,
          startTime: null,
          pausedTime: 0,
          currentSessionId: null,
          selectedProjectId: null,
          lastHeartbeat: Date.now(),
        });
      },
    }),
    {
      name: 'pomodoro-timer-store',
      partialize: (state) => ({
        // ✅ NOW PERSIST: Timer state for page refresh recovery
        timerState: state.timerState,
        isRunning: state.isRunning,
        timeLeft: state.timeLeft,
        completedIntervals: state.completedIntervals,
        startTime: state.startTime,
        pausedTime: state.pausedTime,
        currentSessionId: state.currentSessionId,
        selectedProjectId: state.selectedProjectId,
        lastHeartbeat: state.lastHeartbeat,
        
        // UI preferences
        showGlobalTimer: state.showGlobalTimer,
        
        // Store preferences too (backup)
        workDuration: state.workDuration,
        breakDuration: state.breakDuration,
        longBreakDuration: state.longBreakDuration,
        longBreakInterval: state.longBreakInterval,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🔄 Rehydrating Pomodoro state');
          
          // Validate and recover session after page refresh
          setTimeout(() => {
            state.recoverSession();
          }, 100); // Small delay to ensure everything is initialized
        }
      },
    }
  )
); 

 
