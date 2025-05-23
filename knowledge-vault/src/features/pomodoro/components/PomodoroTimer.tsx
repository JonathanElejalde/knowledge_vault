"use client"

import { useState, useRef, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { Settings, Play, Pause, RotateCcw, StickyNote, AlertTriangle } from "lucide-react"
import { Button } from "@/components/atoms/Button"
import { Slider } from "@/components/atoms/Slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/atoms/Dialog"
import NotesEditor from "@/features/notes/components/NotesEditor"
import { usePomodoro } from "@/features/pomodoro/hooks/usePomodoro"
import { cn } from "@/lib/utils"

interface PomodoroTimerProps {
  selectedProjectId?: string | null;
}

export function PomodoroTimer({ selectedProjectId }: PomodoroTimerProps) {
  const {
    timerState,
    isRunning,
    timeLeft,
    completedIntervals,
    preferences,
    startTimer,
    pauseTimer,
    resetTimer,
    updatePreferences,
    abandonSession,
  } = usePomodoro()

  const [showSettings, setShowSettings] = useState(false)
  const [showProjectPrompt, setShowProjectPrompt] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)
  
  // State to track if the user intends the notes window to be open
  const [showNotesWindow, setShowNotesWindow] = useState(false);
  const notesWindowRef = useRef<Window | null>(null);

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

  // Show project prompt when timer is idle and no project is selected
  useEffect(() => {
    if (timerState === 'idle' && !selectedProjectId) {
      setShowProjectPrompt(true)
    } else {
      setShowProjectPrompt(false)
    }
  }, [timerState, selectedProjectId])

  // Handle start timer with project ID
  const handleStartTimer = () => {
    if (selectedProjectId) {
      startTimer(selectedProjectId)
    }
  }

  // Calculate progress for the circular timer
  const totalTime =
    timerState === "work"
      ? preferences.work_duration * 60
      : timerState === "break"
        ? preferences.break_duration * 60
        : timerState === "longBreak"
          ? preferences.long_break_duration * 60
          : preferences.work_duration * 60

  const progress = (timeLeft / totalTime) * 100
  const circumference = 2 * Math.PI * 45 // 45 is the radius of the circle
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const applySettings = async () => {
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
    }
  }

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
      // This is a common method but can have limitations with complex CSS setups or dynamic loading.
      // A more robust solution might involve a dedicated HTML entry point for the notes window.
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
      // Ensure createRoot is imported from 'react-dom/client'
      const root = createRoot(rootDiv);
      // If NotesEditor requires context, wrap it here with necessary providers
      // For now, assuming NotesEditor is self-contained or uses global state
      root.render(
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* It's good practice to provide a minimal structure if NotesEditor expects to be in one */}
          {/* We can add a simple header inside the window if needed, or let NotesEditor be full-window */}
          {/* <div style={{ padding: '8px', borderBottom: '1px solid #ccc', background: '#f0f0f0' }}>Quick Notes Header</div> */}
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
      // If window is open and user clicks button, focus or close it.
      // For now, let's make it focus. A close action could also be here.
      notesWindowRef.current.focus();
      // Or: closeNotesNewWindow();
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

  const handleAbandonSession = async () => {
    try {
      await abandonSession();
      setShowAbandonConfirm(false);
    } catch (error) {
      console.error('Failed to abandon session:', error);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-64 h-64 mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
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
            )}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold">{formatTime(timeLeft)}</div>
          <div className="text-sm text-muted-foreground mt-2 capitalize">
            {timerState === "idle" ? "Ready" : timerState.replace(/([A-Z])/g, " $1").trim()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {completedIntervals} / {preferences.long_break_interval} intervals
          </div>
        </div>
      </div>

      {showProjectPrompt && (
        <div className="mb-4 text-sm text-muted-foreground animate-pulse">
          Please select a project to start your session
        </div>
      )}

      <div className="flex space-x-2 mb-4">
        {!isRunning ? (
          <Button 
            onClick={handleStartTimer} 
            size="icon" 
            variant="default"
            disabled={!selectedProjectId}
            title={!selectedProjectId ? "Please select a project first" : "Start timer"}
          >
            <Play className="h-5 w-5" />
            <span className="sr-only">Start</span>
          </Button>
        ) : (
          <Button 
            onClick={pauseTimer} 
            size="icon" 
            variant="default"
            title="Pause current session"
          >
            <Pause className="h-5 w-5" />
            <span className="sr-only">Pause</span>
          </Button>
        )}

        <Dialog open={showAbandonConfirm} onOpenChange={setShowAbandonConfirm}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setShowAbandonConfirm(true)} 
              size="icon" 
              variant="destructive"
              title="Abandon current session"
            >
              <AlertTriangle className="h-5 w-5" />
              <span className="sr-only">Abandon</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abandon Session?</DialogTitle>
              <DialogDescription>
                This will mark your current session as abandoned. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAbandonConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleAbandonSession}>
                Abandon Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
              <DialogTitle>Pomodoro Settings</DialogTitle>
              <DialogDescription>
                Customize your work and break durations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Work Duration</label>
                  <span className="text-sm text-muted-foreground">{localWorkTime} minutes</span>
                </div>
                <Slider
                  value={[localWorkTime]}
                  onValueChange={([value]) => setLocalWorkTime(value)}
                  min={1}
                  max={60}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Break Duration</label>
                  <span className="text-sm text-muted-foreground">{localBreakTime} minutes</span>
                </div>
                <Slider
                  value={[localBreakTime]}
                  onValueChange={([value]) => setLocalBreakTime(value)}
                  min={1}
                  max={30}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Long Break Duration</label>
                  <span className="text-sm text-muted-foreground">{localLongBreakTime} minutes</span>
                </div>
                <Slider
                  value={[localLongBreakTime]}
                  onValueChange={([value]) => setLocalLongBreakTime(value)}
                  min={1}
                  max={60}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Intervals Before Long Break</label>
                  <span className="text-sm text-muted-foreground">{localIntervalsBeforeLongBreak}</span>
                </div>
                <Slider
                  value={[localIntervalsBeforeLongBreak]}
                  onValueChange={([value]) => setLocalIntervalsBeforeLongBreak(value)}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={applySettings}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>

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
    </div>
  )
} 