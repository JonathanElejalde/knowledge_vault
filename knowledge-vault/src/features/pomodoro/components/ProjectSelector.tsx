"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/atoms/Button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/atoms/Command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/atoms/Popover"
import { learningProjectsApi } from "@/services/api/learningProjects"
import type { LearningProject } from "@/services/api/types/learningProjects"

interface ProjectSelectorProps {
  value?: string | null;
  onValueChange?: (value: string | null) => void;
}

export function ProjectSelector({ value, onValueChange }: ProjectSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [projects, setProjects] = React.useState<LearningProject[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // Load projects from API
  const loadProjects = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const projectsData = await learningProjectsApi.list({ status: 'in_progress' })
      setProjects(projectsData)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load projects when dialog opens
  React.useEffect(() => {
    if (open) {
      loadProjects()
    }
  }, [open, loadProjects])

  const selectedProject = projects.find((project) => project.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={value ? "outline" : "default"}
          role="combobox" 
          aria-expanded={open} 
          className={cn(
            "w-[240px] justify-between",
            !value && "animate-pulse"
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : selectedProject ? (
            selectedProject.name
          ) : (
            <>
              <span className="flex items-center">
                <ChevronsUpDown className="mr-2 h-4 w-4" />
                Select project...
              </span>
            </>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder="Search project..." />
          <CommandList>
            <CommandEmpty>No project found.</CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => {
                    const newValue = value === project.id ? null : project.id
                    onValueChange?.(newValue)
                    setOpen(false)
                  }}
                >
                  <Check 
                    className={cn(
                      "mr-2 h-4 w-4", 
                      value === project.id ? "opacity-100" : "opacity-0"
                    )} 
                  />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 