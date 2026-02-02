import { useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { DailyActivity } from '@/services/api/types/dashboard';
import { formatChartDate } from '../utils/formatters';
import EmptyState from './EmptyState';

interface DailyActivityChartProps {
  data: DailyActivity[];
  className?: string;
}

interface ChartData {
  date: string;
  displayDate: string;
  sessions: number;
  abandoned: number;
  notes: number;
}

// Max days to show before requiring expansion
const DEFAULT_VISIBLE_DAYS = 180; // 6 months

/**
 * Transform backend data to chart format
 */
function transformToChartData(data: DailyActivity[]): ChartData[] {
  return data.map(item => ({
    date: item.date,
    displayDate: formatChartDate(item.date),
    sessions: item.sessions_count,
    abandoned: item.abandoned_sessions_count,
    notes: item.notes_count,
  }));
}

/**
 * Smart tick interval for X-axis based on data length
 * Shows fewer labels for larger datasets
 */
function getTickInterval(dataLength: number): number {
  if (dataLength <= 14) return 0; // Show all
  if (dataLength <= 31) return 2; // Every 3rd
  if (dataLength <= 90) return 6; // Every week
  if (dataLength <= 180) return 13; // Every 2 weeks
  return 29; // Monthly
}

export default function DailyActivityChart({ data, className }: DailyActivityChartProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Transform backend data to chart format
  const fullChartData = transformToChartData(data);
  
  // Determine if we need expansion controls
  const needsExpansion = fullChartData.length > DEFAULT_VISIBLE_DAYS;
  
  // Get visible data based on expansion state
  const chartData = needsExpansion && !isExpanded
    ? fullChartData.slice(-DEFAULT_VISIBLE_DAYS) // Show last 6 months
    : fullChartData;
  
  // Calculate tick interval based on visible data
  const tickInterval = getTickInterval(chartData.length);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-base border border-border-subtle rounded-lg p-3 shadow-[var(--shadow-lg)]">
          <p className="font-medium text-text-primary mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Check if data has any activity at all
  const hasAnyActivity = fullChartData.some(d => d.sessions > 0 || d.abandoned > 0 || d.notes > 0);
  
  if (!hasAnyActivity) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No activity yet"
        description="Complete sessions or create notes to see your daily activity visualized here."
        action={{
          label: "View Notes",
          onClick: () => navigate("/notes"),
          variant: "secondary",
        }}
        mood="insight"
        className={className}
      />
    );
  }

  // Calculate hidden days count for the expand button
  const hiddenDays = fullChartData.length - DEFAULT_VISIBLE_DAYS;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Expansion toggle for large datasets */}
      {needsExpansion && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md",
              "text-xs font-medium",
              "text-text-secondary hover:text-accent-primary",
              "bg-surface-sunken hover:bg-accent-primary-subtle",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            )}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show last 6 months
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show all ({hiddenDays} more days)
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              angle={chartData.length > 60 ? -45 : 0}
              textAnchor={chartData.length > 60 ? 'end' : 'middle'}
              height={chartData.length > 60 ? 50 : 30}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={30}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="rect"
            />
            <Bar 
              dataKey="sessions" 
              name="Completed"
              stackId="activity"
              fill="hsl(var(--palette-ocean))" 
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="abandoned" 
              name="Abandoned"
              stackId="activity"
              fill="hsl(var(--semantic-warning))" 
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="notes" 
              name="Notes"
              stackId="activity"
              fill="hsl(var(--palette-steel))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 