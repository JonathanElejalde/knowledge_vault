import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Timer, Play, Pause, Eye } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { pomodoroApi } from '@/services/api/pomodoro';
import { cn } from '@/lib/utils';

export function GlobalTimer() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    isRunning,
    timeLeft,
    timerState,
    showGlobalTimer,
    workDuration,
    breakDuration,
    longBreakDuration,
    startTimer: startGlobalTimer,
    resetTimer: resetGlobalTimer,
    pauseTimer,
    resumeTimer,
  } = usePomodoroStore();

  const syncInFlightRef = useRef(false);

  const syncActiveSession = useCallback(async () => {
    if (syncInFlightRef.current) {
      return;
    }
    syncInFlightRef.current = true;

    try {
      const sessions = await pomodoroApi.getSessions({
        status: 'in_progress',
        limit: 1,
        skip: 0,
      });
      const activeSession = sessions?.[0] ?? null;
      const state = usePomodoroStore.getState();
      const localSessionId = state.currentSessionId;

      if (!activeSession) {
        // Keep fallback local-only sessions untouched; clear stale backend sessions.
        if (localSessionId && !localSessionId.startsWith('fallback-')) {
          resetGlobalTimer();
        }
        return;
      }

      const sessionStartMs = new Date(activeSession.start_time).getTime();
      const shouldHydrateFromBackend = !localSessionId || localSessionId !== activeSession.id;

      if (shouldHydrateFromBackend) {
        startGlobalTimer(
          activeSession.id,
          activeSession.learning_project_id ?? undefined,
          Number.isFinite(sessionStartMs) ? sessionStartMs : undefined
        );
      } else if (state.timerState === 'idle') {
        // Recover stale local idle state for the active backend session.
        startGlobalTimer(
          activeSession.id,
          activeSession.learning_project_id ?? undefined,
          Number.isFinite(sessionStartMs) ? sessionStartMs : undefined
        );
      } else if (activeSession.learning_project_id && state.selectedProjectId !== activeSession.learning_project_id) {
        state.setSelectedProjectId(activeSession.learning_project_id);
      }
    } catch {
      // Ignore transient failures; next sync/focus will retry.
    } finally {
      syncInFlightRef.current = false;
    }
  }, [resetGlobalTimer, startGlobalTimer]);

  useEffect(() => {
    void syncActiveSession();

    const intervalId = window.setInterval(() => {
      void syncActiveSession();
    }, 15000);

    const handleFocus = () => {
      void syncActiveSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncActiveSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncActiveSession]);

  // Don't show if:
  // - Not running
  // - User disabled global timer
  // - Currently on pomodoro page
  const shouldShow = isRunning && showGlobalTimer && location.pathname !== '/pomodoro';

  if (!shouldShow) return null;

  // Calculate progress percentage
  const totalTime = timerState === 'work' 
    ? workDuration * 60 
    : timerState === 'break' 
    ? breakDuration * 60 
    : longBreakDuration * 60;
  
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer state display text and colors
  const getTimerStateInfo = () => {
    switch (timerState) {
      case 'work':
        return {
          text: 'Focus Session',
          bgColor: 'bg-primary',
          progressColor: 'bg-primary-foreground',
          textColor: 'text-primary-foreground',
        };
      case 'break':
        return {
          text: 'Short Break',
          bgColor: 'bg-green-600',
          progressColor: 'bg-green-100',
          textColor: 'text-green-50',
        };
      case 'longBreak':
        return {
          text: 'Long Break',
          bgColor: 'bg-blue-600',
          progressColor: 'bg-blue-100',
          textColor: 'text-blue-50',
        };
      default:
        return {
          text: 'Timer',
          bgColor: 'bg-primary',
          progressColor: 'bg-primary-foreground',
          textColor: 'text-primary-foreground',
        };
    }
  };

  const stateInfo = getTimerStateInfo();

  const handleToggleTimer = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  const handleViewFullTimer = () => {
    navigate('/pomodoro');
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden under the fixed bar */}
      <div className="h-14" />
      
      {/* Fixed timer bar */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b shadow-sm",
        stateInfo.bgColor,
        stateInfo.textColor
      )}>
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left side: Timer info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span className="font-semibold">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-sm opacity-90">
                  {stateInfo.text}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-32 h-2 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000 ease-linear",
                    stateInfo.progressColor
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Right side: Controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleViewFullTimer}
                className={cn(
                  "hover:bg-white/10",
                  stateInfo.textColor
                )}
              >
                <Eye className="h-3 w-3 mr-1" />
                View Timer
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleTimer}
                className={cn(
                  "hover:bg-white/10",
                  stateInfo.textColor
                )}
              >
                {isRunning ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                <span className="sr-only">
                  {isRunning ? 'Pause' : 'Resume'} timer
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
