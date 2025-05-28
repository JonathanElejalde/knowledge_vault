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
import type { DailyActivity } from '@/services/api/types/dashboard';
import { formatChartDate } from '../utils/formatters';

interface DailyActivityChartProps {
  data: DailyActivity[];
  className?: string;
}

interface ChartData {
  date: string;
  displayDate: string;
  sessions: number;
  notes: number;
}

export default function DailyActivityChart({ data, className }: DailyActivityChartProps) {
  // Transform data for the chart
  const chartData: ChartData[] = data.map(item => ({
    date: item.date,
    displayDate: formatChartDate(item.date),
    sessions: item.sessions_count,
    notes: item.notes_count,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
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

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-40 text-muted-foreground ${className}`}>
        No activity data available
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="displayDate" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="rect"
          />
          <Bar 
            dataKey="sessions" 
            name="Sessions"
            stackId="activity"
            fill="hsl(var(--primary))" 
            radius={[0, 0, 4, 4]}
          />
          <Bar 
            dataKey="notes" 
            name="Notes"
            stackId="activity"
            fill="hsl(var(--secondary))" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 