import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Cell
} from 'recharts';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SessionTime } from '@/services/api/types/dashboard';
import { formatChartDate, formatTime, getHourFromDateTime, getProjectColor } from '../utils/formatters';
import { parseUTCToLocal } from '@/lib/utils/dateUtils';
import EmptyState from './EmptyState';

interface SessionTimelineChartProps {
  data: SessionTime[];
  className?: string;
}

interface ChartData {
  date: string;
  displayDate: string;
  hour: number;
  duration: number | null;
  projectName: string | null;
  startTime: string;
  color: string;
}

export default function SessionTimelineChart({ data, className }: SessionTimelineChartProps) {
  const navigate = useNavigate();
  
  // Transform data for the chart
  const chartData: ChartData[] = data
    .filter(item => item.duration !== null) // Only show sessions with duration
    .map(item => {
      // Calculate local date from UTC start_time
      const localDateTime = parseUTCToLocal(item.start_time);
      const localDate = localDateTime.toISODate(); // Returns "2024-01-15" format
      
      return {
        date: localDate || '',
        displayDate: formatChartDate(item.start_time),
        hour: getHourFromDateTime(item.start_time),
        duration: item.duration,
        projectName: item.project_name,
        startTime: item.start_time,
        color: getProjectColor(item.project_name),
      };
    });

  // Group data by date for x-axis
  const uniqueDates = Array.from(new Set(chartData.map(item => item.displayDate)));
  const dateToIndex = new Map(uniqueDates.map((date, index) => [date, index]));

  // Transform data to use date index for x-axis
  const scatterData = chartData.map(item => ({
    ...item,
    x: dateToIndex.get(item.displayDate) || 0,
    y: item.hour,
  }));

  // Get unique projects for legend
  const uniqueProjects = Array.from(new Set(chartData.map(item => item.projectName).filter(Boolean)));
  const projectColors = uniqueProjects.map(project => ({
    project,
    color: getProjectColor(project),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-1">{data.displayDate}</p>
          <p className="text-sm mb-1">Time: {formatTime(data.startTime)}</p>
          <p className="text-sm mb-1">Duration: {data.duration}m</p>
          <p className="text-sm" style={{ color: data.color }}>
            Project: {data.projectName || 'No project'}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {projectColors.map(({ project, color }) => (
        <div key={project} className="flex items-center gap-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-muted-foreground">
            {project && project.length > 20 ? `${project.substring(0, 20)}...` : project}
          </span>
        </div>
      ))}
      {chartData.some(item => !item.projectName) && (
        <div className="flex items-center gap-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: getProjectColor(null) }}
          />
          <span className="text-xs text-muted-foreground">No project</span>
        </div>
      )}
    </div>
  );

  if (chartData.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No sessions recorded"
        description="Your focus timeline will appear here after completing Pomodoros"
        action={{
          label: "Start Focusing",
          onClick: () => navigate("/pomodoro"),
        }}
        mood="focus"
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          data={scatterData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            type="number"
            dataKey="x"
            domain={[0, uniqueDates.length - 1]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => uniqueDates[value] || ''}
          />
          <YAxis 
            type="number"
            dataKey="y"
            domain={[0, 24]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Math.floor(value)}:00`}
            label={{ value: 'Hour of Day', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter dataKey="y" fill="hsl(var(--primary))">
            {scatterData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
} 