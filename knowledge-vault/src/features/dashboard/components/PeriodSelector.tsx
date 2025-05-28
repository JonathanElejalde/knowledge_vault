import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/Tabs";
import type { DashboardPeriod } from "@/services/api/types/dashboard";

interface PeriodSelectorProps {
  selectedPeriod: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  className?: string;
}

const periodOptions: { value: DashboardPeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '2w', label: 'Last 2 weeks' },
  { value: '4w', label: 'Last 4 weeks' },
  { value: '3m', label: 'Last 3 months' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

export default function PeriodSelector({ 
  selectedPeriod, 
  onPeriodChange, 
  className 
}: PeriodSelectorProps) {
  return (
    <Tabs 
      value={selectedPeriod} 
      onValueChange={(value) => onPeriodChange(value as DashboardPeriod)}
      className={className}
    >
      <TabsList className="grid w-full grid-cols-6">
        {periodOptions.map((option) => (
          <TabsTrigger 
            key={option.value} 
            value={option.value}
            className="text-xs sm:text-sm"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
} 