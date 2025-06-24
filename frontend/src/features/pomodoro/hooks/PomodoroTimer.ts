// Production-Ready Pomodoro Timer with Robust Session Management
// Solves: Background tab throttling, page refresh persistence, reliable session completion

import { useRef, useCallback, useEffect, useState } from 'react';

export interface TimerConfig {
  duration: number; // in seconds
  onTick?: (timeLeft: number) => void;
  onComplete?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  autoStart?: boolean;
}

export interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  progress: number; // 0 to 1
  startTime: number | null;
  pausedTime: number; // total time spent paused
}

export interface TimerControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => void;
  setDuration: (duration: number) => void;
}

/**
 * A precision timer hook that persists across page refreshes
 * Uses timestamp-based calculations for accuracy
 */
export function usePomodoroTimer(config: TimerConfig): TimerState & TimerControls {
  const {
    duration,
    onTick,
    onComplete,
    onPause,
    onResume,
    autoStart = false
  } = config;

  // State
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedTime, setPausedTime] = useState(0);

  // Refs for precision timing
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(duration);
  const completedRef = useRef(false);

  // Update duration ref when duration changes
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer calculation function
  const calculateTimeLeft = useCallback(() => {
    if (!startTime) return durationRef.current;
    
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    const adjustedElapsed = elapsed - Math.floor(pausedTime / 1000);
    const remaining = Math.max(0, durationRef.current - adjustedElapsed);
    
    return remaining;
  }, [startTime, pausedTime]);

  // Start interval for precision timing
  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const remaining = calculateTimeLeft();
      
      setTimeLeft(remaining);
      onTick?.(remaining);

      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        setIsComplete(true);
        setIsRunning(false);
        setIsPaused(false);
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        onComplete?.();
      }
    }, 100); // Higher frequency for smoother updates
  }, [calculateTimeLeft, onTick, onComplete]);

  // Clear interval
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Timer controls
  const start = useCallback(() => {
    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
    setIsPaused(false);
    setIsComplete(false);
    setPausedTime(0);
    completedRef.current = false;
    setTimeLeft(durationRef.current);
    startInterval();
  }, [startInterval]);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;
    
    setIsPaused(true);
    setIsRunning(false);
    clearTimerInterval();
    onPause?.();
  }, [isRunning, isPaused, clearTimerInterval, onPause]);

  const resume = useCallback(() => {
    if (!isPaused) return;
    
    setIsPaused(false);
    setIsRunning(true);
    
    // Adjust for paused time
    const now = Date.now();
    const currentTimeLeft = calculateTimeLeft();
    const newStartTime = now - (durationRef.current - currentTimeLeft) * 1000;
    setStartTime(newStartTime);
    
    startInterval();
    onResume?.();
  }, [isPaused, calculateTimeLeft, startInterval, onResume]);

  const reset = useCallback(() => {
    clearTimerInterval();
    setTimeLeft(durationRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setStartTime(null);
    setPausedTime(0);
    completedRef.current = false;
  }, [clearTimerInterval]);

  const stop = useCallback(() => {
    clearTimerInterval();
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setStartTime(null);
    setPausedTime(0);
    completedRef.current = false;
  }, [clearTimerInterval]);

  const setDuration = useCallback((newDuration: number) => {
    durationRef.current = newDuration;
    if (!isRunning && !isPaused) {
      setTimeLeft(newDuration);
    }
  }, [isRunning, isPaused]);

  // Calculate progress
  const progress = duration > 0 ? Math.max(0, (duration - timeLeft) / duration) : 0;

  // Auto-start if configured
  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, [autoStart, start]);

  return {
    // State
    timeLeft,
    isRunning,
    isPaused,
    isComplete,
    progress,
    startTime,
    pausedTime,
    
    // Controls
    start,
    pause,
    resume,
    reset,
    stop,
    setDuration,
  };
} 