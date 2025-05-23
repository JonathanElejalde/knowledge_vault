"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/atoms/Button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/atoms/Command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/atoms/Popover"

const projects = [
  {
    value: "fastapi",
    label: "Platzi - FastAPI servers",
  },
  {
    value: "ml-basics",
    label: "Machine Learning Basics",
  },
  {
    value: "react-patterns",
    label: "React Advanced Patterns",
  },
  {
    value: "python-data",
    label: "Python Data Analysis",
  },
  {
    value: "js-algorithms",
    label: "JavaScript Algorithms",
  },
]

export function ProjectSelector() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[240px] justify-between" /* onClick={() => setOpen(prev => !prev)} - No longer needed */ >
          {value ? projects.find((project) => project.value === value)?.label : "Select project..."}
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
                  key={project.value}
                  value={project.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === project.value ? "opacity-100" : "opacity-0")} />
                  {project.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 