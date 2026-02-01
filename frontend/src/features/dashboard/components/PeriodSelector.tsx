import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/DropdownMenu";
import { Button } from "@/components/atoms/Button";
import { ChevronDown, Calendar } from "lucide-react";
import type { DashboardPeriod } from "@/services/api/types/dashboard";

interface PeriodSelectorProps {
  selectedPeriod: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  className?: string;
}

const periodOptions: { value: DashboardPeriod; label: string; shortLabel: string }[] = [
  { value: '7d', label: 'Last 7 days', shortLabel: '7D' },
  { value: '2w', label: 'Last 2 weeks', shortLabel: '2W' },
  { value: '4w', label: 'Last 4 weeks', shortLabel: '4W' },
  { value: '3m', label: 'Last 3 months', shortLabel: '3M' },
  { value: '1y', label: 'Last year', shortLabel: '1Y' },
  { value: 'all', label: 'All time', shortLabel: 'All' },
];

export default function PeriodSelector({ 
  selectedPeriod, 
  onPeriodChange, 
  className 
}: PeriodSelectorProps) {
  const selectedOption = periodOptions.find(o => o.value === selectedPeriod);

  return (
    <>
      {/* Mobile: Dropdown */}
      <div className={cn("sm:hidden", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4 text-text-tertiary" />
              {selectedOption?.label}
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {periodOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onPeriodChange(option.value)}
                className={cn(
                  selectedPeriod === option.value && "bg-accent-primary-subtle text-accent-primary"
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: Segmented Control */}
      <div 
        className={cn(
          "hidden sm:inline-flex items-center gap-1 p-1",
          "bg-surface-sunken rounded-[var(--radius-lg)]",
          "border border-border-subtle",
          className
        )}
        role="tablist"
        aria-label="Select time period"
      >
        {periodOptions.map((option) => {
          const isActive = selectedPeriod === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onPeriodChange(option.value)}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "px-3 py-2 rounded-[var(--radius-md)]",
                "text-body-sm font-medium whitespace-nowrap",
                "transition-all duration-[var(--motion-duration)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
                // Default state
                "text-text-secondary hover:text-text-primary hover:bg-surface-base/50",
                // Active state
                isActive && [
                  "bg-surface-base text-text-primary",
                  "shadow-sm",
                ]
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
