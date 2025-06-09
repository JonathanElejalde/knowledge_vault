"use client"

import { ProjectSelector as AtomicProjectSelector } from "@/components/atoms/ProjectSelector"

interface ProjectSelectorProps {
  value?: string | null;
  onValueChange?: (value: string | null) => void;
}

export function ProjectSelector({ value, onValueChange }: ProjectSelectorProps) {
  // For Pomodoro, we want to emphasize when no project is selected
  const hasSelection = !!value;
  
  return (
    <AtomicProjectSelector
      value={value}
      onValueChange={onValueChange}
      placeholder="Select project..."
      className={`w-[240px] ${!hasSelection ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
    />
  )
} 