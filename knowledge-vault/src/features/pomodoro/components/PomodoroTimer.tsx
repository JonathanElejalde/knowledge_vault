"use client"

import { useState, useEffect, useRef } from "react"
import { createRoot } from "react-dom/client"
import { Settings, Play, Pause, Square, AlertTriangle, StickyNote } from "lucide-react"
import { Button } from "@/components/atoms/Button"
import { Slider } from "@/components/atoms/Slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/atoms/Dialog"
import NotesEditor from "@/features/notes/components/NotesEditor"
import { usePomodoro } from "@/features/pomodoro/hooks/usePomodoro"
import { learningProjectsApi } from "@/services/api/learningProjects"

import { cn } from "@/lib/utils"

interface PomodoroTimerProps {
  selectedProjectId?: string | null;
  onProjectNameUpdate?: (projectId: string, projectName: string) => void;
}

export function PomodoroTimer({ selectedProjectId, onProjectNameUpdate }: PomodoroTimerProps) {
  const {
    timerState,
    isRunning,
    timeLeft,
    completedIntervals,
    currentSession,
    preferences,
    isLoadingPreferences,
    startTimer,
    pauseTimer,
    resumeTimer,
    abandonSession,
    updatePreferences,
  } = usePomodoro()

  // UI state
  const [showSettings, setShowSettings] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false)
  
  // Notes window state
  const [showNotesWindow, setShowNotesWindow] = useState(false)
  const notesWindowRef = useRef<Window | null>(null)

  // Project name state
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null)
  const [isLoadingProjectName, setIsLoadingProjectName] = useState(false)
  
  // Simple cache for project names to avoid repeated API calls
  const projectNameCacheRef = useRef<Map<string, string>>(new Map())

  // Local settings state for the dialog
  const [localWorkTime, setLocalWorkTime] = useState(preferences.work_duration)
  const [localBreakTime, setLocalBreakTime] = useState(preferences.break_duration)
  const [localLongBreakTime, setLocalLongBreakTime] = useState(preferences.long_break_duration)
  const [localIntervalsBeforeLongBreak, setLocalIntervalsBeforeLongBreak] = useState(preferences.long_break_interval)

  // Update local settings when preferences change
  useEffect(() => {
    setLocalWorkTime(preferences.work_duration)
    setLocalBreakTime(preferences.break_duration)
    setLocalLongBreakTime(preferences.long_break_duration)
    setLocalIntervalsBeforeLongBreak(preferences.long_break_interval)
  }, [preferences])

  // Fetch project name when selectedProjectId changes
  useEffect(() => {
    const fetchProjectName = async () => {
      if (!selectedProjectId) {
        setSelectedProjectName(null)
        return
      }

      // Check cache first
      const cachedName = projectNameCacheRef.current.get(selectedProjectId)
      if (cachedName) {
        setSelectedProjectName(cachedName)
        return
      }

      try {
        setIsLoadingProjectName(true)
        const project = await learningProjectsApi.get(selectedProjectId)
        setSelectedProjectName(project.name)
        // Cache the project name
        projectNameCacheRef.current.set(selectedProjectId, project.name)
        // Notify parent component if callback provided
        onProjectNameUpdate?.(selectedProjectId, project.name)
      } catch (error) {
        console.error('Failed to fetch project name:', error)
        const fallbackName = `Project ${selectedProjectId}`
        setSelectedProjectName(fallbackName)
        // Cache the fallback name to avoid repeated failed requests
        projectNameCacheRef.current.set(selectedProjectId, fallbackName)
      } finally {
        setIsLoadingProjectName(false)
      }
    }

    fetchProjectName()
  }, [selectedProjectId])

  // Calculate progress for the circular timer
  const totalTime = getTotalTimeForState(timerState, preferences)
  const progress = (timeLeft / totalTime) * 100
  const circumference = 2 * Math.PI * 45 // 45 is the radius of the circle
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Handle start/pause/resume
  const handlePlayPause = async () => {
    if (timerState === 'idle') {
      // Start new session
      await startTimer(selectedProjectId || undefined)
    } else if (isRunning) {
      // Pause current session
      pauseTimer()
    } else {
      // Resume paused session
      resumeTimer()
    }
  }

  // Handle abandon session with confirmation
  const handleAbandonSession = async () => {
    setShowAbandonConfirm(false)                        
    
    try {
      await abandonSession()
    } catch (error) {
      console.error('Error in handleAbandonSession:', error);
    }
  }

  // Handle preferences update
  const handleUpdatePreferences = async () => {
    setIsUpdatingPreferences(true)
    try {
      await updatePreferences({
        work_duration: localWorkTime,
        break_duration: localBreakTime,
        long_break_duration: localLongBreakTime,
        long_break_interval: localIntervalsBeforeLongBreak,
      })
      
      setShowSettings(false)
    } catch (error) {
      console.error('Failed to update preferences:', error)
      // TODO: Show error toast
    } finally {
      setIsUpdatingPreferences(false)
    }
  }

  // Notes window functionality
  const openNotesNewWindow = () => {
    if (notesWindowRef.current && !notesWindowRef.current.closed) {
      notesWindowRef.current.focus();
      return;
    }

    const newWindow = window.open("", "pomodoroNotesWindow", "width=450,height=550,left=200,top=200,resizable,scrollbars");

    if (newWindow) {
      notesWindowRef.current = newWindow;
      newWindow.document.title = "Quick Session Notes";

      // Create a root div for React
      const rootDiv = newWindow.document.createElement('div');
      rootDiv.id = 'notes-editor-root';
      newWindow.document.body.appendChild(rootDiv);
      
      // Apply some basic styling to the new window's body for better appearance
      newWindow.document.body.style.margin = '0';
      newWindow.document.body.style.overflow = 'hidden'; // NotesEditor should handle its own scrolling
      rootDiv.style.height = '100vh'; // Ensure root div takes full height

      // Copy stylesheets from parent to new window
      Array.from(document.styleSheets).forEach(styleSheet => {
        try {
          if (styleSheet.href) {
            const link = newWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            newWindow.document.head.appendChild(link);
          } else if (styleSheet.ownerNode instanceof HTMLStyleElement && styleSheet.ownerNode.textContent) {
            const style = newWindow.document.createElement('style');
            style.textContent = styleSheet.ownerNode.textContent;
            newWindow.document.head.appendChild(style);
          }
        } catch (e) {
          console.warn("Could not copy stylesheet:", styleSheet, e);
        }
      });
      
      // Ensure the new window has a body and head, if not, create them
      if (!newWindow.document.head) {
        const head = newWindow.document.createElement('head');
        newWindow.document.documentElement.insertBefore(head, newWindow.document.body);
      }
      if (!newWindow.document.body) {
        const body = newWindow.document.createElement('body');
        newWindow.document.documentElement.appendChild(body);
        body.appendChild(rootDiv); // Re-append rootDiv if body was just created
      }

      // Render the NotesEditor component into the new window
      const root = createRoot(rootDiv);
      root.render(
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <NotesEditor />
        </div>
      );
      
      setShowNotesWindow(true);

      // When the new window is closed by the user
      newWindow.onbeforeunload = () => {
        setShowNotesWindow(false);
        notesWindowRef.current = null;
        root.unmount(); // Clean up React root
      };
    } else {
      // Handle popup blocker
      alert("Popup window blocked. Please allow popups for this site to use Quick Notes.");
      setShowNotesWindow(false);
    }
  };

  const toggleNotesWindow = () => {
    if (showNotesWindow && notesWindowRef.current && !notesWindowRef.current.closed) {
      // If window is open and user clicks button, focus it
      notesWindowRef.current.focus();
    } else {
      openNotesNewWindow();
    }
  };

  // Effect to close the notes window if the main component unmounts
  useEffect(() => {
    return () => {
      if (notesWindowRef.current && !notesWindowRef.current.closed) {
        notesWindowRef.current.close();
      }
    };
  }, []);

  // Determine if we can start a timer
  const canStartTimer = timerState === 'idle' && selectedProjectId
  
  // Determine if we should show abandon button
  const shouldShowAbandonButton = currentSession !== null || timerState !== 'idle'

  // Determine if we have an active session (work, break, or long break)
  const hasActiveSession = !!currentSession && (timerState === 'work' || timerState === 'break' || timerState === 'longBreak')

  // Determine the current timer state for better UX
  const isPaused = !isRunning && timerState !== 'idle'
  const isIdle = timerState === 'idle'

  return (
    <div className="flex flex-col items-center">
      {/* Circular Timer Display */}
      <div className="relative w-64 h-64 mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="4" 
            className="text-muted" 
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-1000 ease-in-out",
              timerState === "work"
                ? "text-primary"
                : timerState === "break"
                  ? "text-green-500"
                  : timerState === "longBreak"
                    ? "text-blue-500"
                    : "text-primary",
              isPaused && "opacity-60 animate-pulse"
            )}
          />
        </svg>

        {/* Timer content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold">{formatTime(timeLeft)}</div>
          <div className="text-sm text-muted-foreground mt-2 capitalize">
            {isIdle 
              ? "Ready" 
              : isPaused 
                ? `${timerState.replace(/([A-Z])/g, " $1").trim()} - Paused`
                : timerState.replace(/([A-Z])/g, " $1").trim()
            }
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {completedIntervals} / {preferences.long_break_interval} intervals
          </div>
        </div>
      </div>

      {/* Selected Project Display - Subtle */}
      {selectedProjectId && (
        <div className="mb-3 text-center">
          <div className="text-xs text-muted-foreground/70">
            {isLoadingProjectName ? (
              <span className="animate-pulse">Loading project...</span>
            ) : (
              <>Project: {selectedProjectName || selectedProjectId}</>
            )}
          </div>
        </div>
      )}

      {/* Project Selection Prompt */}
      {timerState === 'idle' && !selectedProjectId && (
        <div className="mb-4 text-sm text-muted-foreground animate-pulse">
          Please select a project to start your session
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex space-x-2 mb-4">
        {/* Start/Pause/Resume Button */}
        {!isRunning ? (
          <Button 
            onClick={handlePlayPause} 
            size="icon" 
            variant="default"
            disabled={!canStartTimer && isIdle}
            title={
              isIdle 
                ? (!selectedProjectId ? "Please select a project first" : "Start new Pomodoro session")
                : "Resume paused session"
            }
          >
            <Play className="h-5 w-5" />
            <span className="sr-only">{isIdle ? "Start" : "Resume"}</span>
          </Button>
        ) : (
          <Button 
            onClick={handlePlayPause} 
            size="icon" 
            variant="default"
            title="Pause current session"
          >
            <Pause className="h-5 w-5" />
            <span className="sr-only">Pause</span>
          </Button>
        )}

        {/* Abandon Session Button - Show when there's an active session */}
        {shouldShowAbandonButton && (
          <Dialog open={showAbandonConfirm} onOpenChange={setShowAbandonConfirm}>
            <DialogTrigger asChild>
              <Button 
                size="icon" 
                variant="destructive"
                title="Abandon current session"
              >
                <Square className="h-5 w-5" />
                <span className="sr-only">Abandon</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                  Abandon Pomodoro?
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to abandon this Pomodoro session? 
                  Your progress will be saved based on the time you've already worked.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAbandonConfirm(false)}>
                  Continue Session
                </Button>
                <Button variant="destructive" onClick={handleAbandonSession}>
                  Abandon Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Settings Button */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button 
              size="icon" 
              variant="outline"
              title="Configure Pomodoro settings"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Timer Settings</DialogTitle>
              <DialogDescription>
                Customize your Pomodoro timer durations
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Work Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Work Time: {localWorkTime} minutes</label>
                <Slider 
                  value={[localWorkTime]} 
                  min={1} 
                  max={60} 
                  step={1} 
                  onValueChange={(value) => setLocalWorkTime(value[0])} 
                />
              </div>

              {/* Break Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Break Time: {localBreakTime} minutes</label>
                <Slider
                  value={[localBreakTime]}
                  min={1}
                  max={60}
                  step={1}
                  onValueChange={(value) => setLocalBreakTime(value[0])}
                />
              </div>

              {/* Long Break Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Long Break Time: {localLongBreakTime} minutes</label>
                <Slider
                  value={[localLongBreakTime]}
                  min={1}
                  max={60}
                  step={1}
                  onValueChange={(value) => setLocalLongBreakTime(value[0])}
                />
              </div>

              {/* Long Break Interval */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Intervals Before Long Break: {localIntervalsBeforeLongBreak}</label>
                <Slider
                  value={[localIntervalsBeforeLongBreak]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setLocalIntervalsBeforeLongBreak(value[0])}
                />
              </div>

              {/* Warning message for active session */}
              {hasActiveSession && (
                <div className="flex items-start space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800 mb-1">Session in Progress</p>
                    <p className="text-orange-700">
                      Settings cannot be saved while a Pomodoro session is active. 
                      Please complete or abandon your current session to apply changes.
                    </p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleUpdatePreferences} 
                className="w-full"
                disabled={isUpdatingPreferences || hasActiveSession}
              >
                {isUpdatingPreferences 
                  ? 'Saving...' 
                  : hasActiveSession 
                    ? 'Cannot Save During Active Session'
                    : 'Apply Settings'
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notes Button */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleNotesWindow}
          title="Open Quick Notes (for current session) in a new window"
        >
          <StickyNote className="h-5 w-5" />
          <span className="sr-only">Quick Notes</span>
        </Button>
      </div>

      {/* Loading State */}
      {isLoadingPreferences && (
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground">Loading preferences...</p>
        </div>
      )}
    </div>
  )
}

// Helper function to get total time for a timer state
function getTotalTimeForState(
  timerState: 'idle' | 'work' | 'break' | 'longBreak', 
  preferences: { work_duration: number; break_duration: number; long_break_duration: number }
): number {
  switch (timerState) {
    case 'work':
      return preferences.work_duration * 60
    case 'break':
      return preferences.break_duration * 60
    case 'longBreak':
      return preferences.long_break_duration * 60
    default:
      return preferences.work_duration * 60
  }
} 