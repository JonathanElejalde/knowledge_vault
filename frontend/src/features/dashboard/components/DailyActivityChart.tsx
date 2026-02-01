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
import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  notes: number;
}

export default function DailyActivityChart({ data, className }: DailyActivityChartProps) {
  const navigate = useNavigate();
  
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

  // Check if data is empty or has no activity
  const hasData = chartData.length > 0 && chartData.some(d => d.sessions > 0 || d.notes > 0);
  
  if (!hasData) {
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
            fill="hsl(var(--palette-ocean))" 
            radius={[0, 0, 4, 4]}
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
  );
} 