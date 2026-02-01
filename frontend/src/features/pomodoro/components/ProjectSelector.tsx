"use client"

import { ProjectSelector as AtomicProjectSelector } from "@/components/atoms/ProjectSelector"
import { cn } from "@/lib/utils"

interface ProjectSelectorProps {
  value?: string | null;
  onValueChange?: (value: string | null) => void;
}

/**
 * ProjectSelector for Pomodoro - Deep Focus Design
 * 
 * Clear, readable styling with emphasis when no project is selected.
 */
export function ProjectSelector({ value, onValueChange }: ProjectSelectorProps) {
  const hasSelection = !!value;
  
  return (
    <AtomicProjectSelector
      value={value}
      onValueChange={onValueChange}
      placeholder="Choose a project..."
      className={cn(
        "w-[260px]",
        !hasSelection && [
          // Outline style with accent border - much more readable
          "border-2 border-accent-primary",
          "text-accent-primary font-medium",
          "hover:bg-accent-primary-subtle"
        ]
      )}
    />
  )
} 