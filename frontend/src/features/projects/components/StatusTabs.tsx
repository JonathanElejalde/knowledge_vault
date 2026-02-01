import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/DropdownMenu";
import { Button } from "@/components/atoms/Button";
import { ChevronDown, Filter } from "lucide-react";

export type ProjectStatusTab = 'all' | 'in_progress' | 'completed' | 'abandoned';

interface StatusTabsProps {
  value: ProjectStatusTab;
  onValueChange: (value: ProjectStatusTab) => void;
  className?: string;
}

const statusOptions: { value: ProjectStatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
];

/**
 * StatusTabs - Pill-style segmented control for project status filtering
 * Matches the Deep Focus Design pattern from PeriodSelector
 */
export function StatusTabs({ value, onValueChange, className }: StatusTabsProps) {
  const selectedOption = statusOptions.find(o => o.value === value);

  return (
    <>
      {/* Mobile: Dropdown */}
      <div className={cn("sm:hidden w-full", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-text-tertiary" />
                {selectedOption?.label}
              </span>
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
            {statusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onValueChange(option.value)}
                className={cn(
                  value === option.value && "bg-accent-primary-subtle text-accent-primary"
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: Segmented Control - pill design */}
      <nav 
        className={cn(
          "hidden sm:inline-flex items-center gap-1 p-1",
          "bg-surface-sunken rounded-lg",
          className
        )}
        role="tablist"
        aria-label="Filter by project status"
      >
        {statusOptions.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onValueChange(option.value)}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "px-4 py-1.5 rounded-md",
                "text-xs font-medium whitespace-nowrap",
                "transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
                // Default state
                "text-text-tertiary hover:text-mood-growth-accent",
                // Active state - white/dark bg with ring
                isActive && [
                  "bg-surface-base dark:bg-surface-raised",
                  "text-text-primary shadow-sm",
                  "ring-1 ring-border-subtle",
                ]
              )}
            >
              {option.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
