"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Settings, Play, Pause, RotateCcw, StickyNote, X } from "lucide-react"
import { Button } from "@/components/atoms/Button"
import { Slider } from "@/components/atoms/Slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/atoms/Dialog"
import NotesEditor from "@/features/notes/components/NotesEditor"
import { cn } from "@/lib/utils"

type TimerState = "idle" | "work" | "break" | "longBreak"

export function PomodoroTimer() {
  const [timerState, setTimerState] = useState<TimerState>("idle")
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
  const [completedIntervals, setCompletedIntervals] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  // Timer settings
  const [workTime, setWorkTime] = useState(25)
  const [breakTime, setBreakTime] = useState(5)
  const [longBreakTime, setLongBreakTime] = useState(15)
  const [intervalsBeforeLongBreak, setIntervalsBeforeLongBreak] = useState(4)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleTimerComplete = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    if (timerState === "work") {
      const newCompletedIntervals = completedIntervals + 1
      setCompletedIntervals(newCompletedIntervals)

      if (newCompletedIntervals % intervalsBeforeLongBreak === 0) {
        setTimerState("longBreak")
        setTimeLeft(longBreakTime * 60)
      } else {
        setTimerState("break")
        setTimeLeft(breakTime * 60)
      }
    } else {
      setTimerState("work")
      setTimeLeft(workTime * 60)
    }
  }, [timerState, completedIntervals, intervalsBeforeLongBreak, longBreakTime, breakTime, workTime])

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            handleTimerComplete()
            return 0
          }
          return prevTime - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning, handleTimerComplete])

  // Calculate progress for the circular timer
  const totalTime =
    timerState === "work"
      ? workTime * 60
      : timerState === "break"
        ? breakTime * 60
        : timerState === "longBreak"
          ? longBreakTime * 60
          : workTime * 60

  const progress = (timeLeft / totalTime) * 100
  const circumference = 2 * Math.PI * 45 // 45 is the radius of the circle
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const startTimer = () => {
    if (timerState === "idle") {
      setTimerState("work")
      if (timeLeft !== workTime * 60) setTimeLeft(workTime * 60)
    }
    setIsRunning(true)
  }

  const pauseTimer = () => {
    setIsRunning(false)
  }

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setIsRunning(false)
    setTimerState("idle")
    setTimeLeft(workTime * 60)
    setCompletedIntervals(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const applySettings = () => {
    setTimeLeft(workTime * 60)
    setIsRunning(false)
    if (timerState !== "idle") setTimerState("idle")
    setShowSettings(false)
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
            {completedIntervals} / {intervalsBeforeLongBreak} intervals
          </div>
        </div>
      </div>

      <div className="flex space-x-2 mb-4">
        {!isRunning ? (
          <Button onClick={startTimer} size="icon" variant="default">
            <Play className="h-5 w-5" />
            <span className="sr-only">Start</span>
          </Button>
        ) : (
          <Button onClick={pauseTimer} size="icon" variant="default">
            <Pause className="h-5 w-5" />
            <span className="sr-only">Pause</span>
          </Button>
        )}

        <Button onClick={resetTimer} size="icon" variant="outline">
          <RotateCcw className="h-5 w-5" />
          <span className="sr-only">Reset</span>
        </Button>

        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Timer Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Work Time: {workTime} minutes</label>
                <Slider defaultValue={[workTime]} min={1} max={60} step={1} onValueChange={(value) => setWorkTime(value[0])} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Break Time: {breakTime} minutes</label>
                <Slider defaultValue={[breakTime]} min={1} max={30} step={1} onValueChange={(value) => setBreakTime(value[0])} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Long Break Time: {longBreakTime} minutes</label>
                <Slider defaultValue={[longBreakTime]} min={5} max={60} step={1} onValueChange={(value) => setLongBreakTime(value[0])} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Intervals Before Long Break: {intervalsBeforeLongBreak}</label>
                <Slider defaultValue={[intervalsBeforeLongBreak]} min={1} max={10} step={1} onValueChange={(value) => setIntervalsBeforeLongBreak(value[0])} />
              </div>
              <Button onClick={applySettings} className="w-full">
                Apply Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setShowNotes(prev => !prev)}
          title="Open Quick Notes (for current session)"
        >
          <StickyNote className="h-5 w-5" />
          <span className="sr-only">Quick Notes</span>
        </Button>

      </div>
      {showNotes && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '400px',
            height: '500px',
            zIndex: 100,
          }}
          className="bg-background border rounded-lg shadow-xl flex flex-col"
        >
          <div className="flex items-center justify-between p-3 border-b cursor-grab active:cursor-grabbing"
          >
            <h3 className="font-medium">Quick Session Notes</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowNotes(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <NotesEditor />
          </div>
        </div>
      )}
    </div>
  )
} 