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
import { FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProjectStats } from '@/services/api/types/dashboard';
import EmptyState from './EmptyState';

interface ProjectStatsChartProps {
  data: ProjectStats[];
  className?: string;
}

interface ChartData {
  projectName: string;
  sessions: number;
  notes: number;
}

export default function ProjectStatsChart({ data, className }: ProjectStatsChartProps) {
  const navigate = useNavigate();
  
  // Transform data for the chart
  const chartData: ChartData[] = data.map(item => ({
    projectName: item.project_name.length > 15 
      ? `${item.project_name.substring(0, 15)}...` 
      : item.project_name,
    sessions: item.sessions_count,
    notes: item.notes_count,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the original project name for the tooltip
      const originalProject = data.find(p => 
        p.project_name.startsWith(label.replace('...', ''))
      );
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{originalProject?.project_name || label}</p>
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
      <EmptyState
        icon={FolderOpen}
        title="No project data"
        description="Create projects and track sessions to see activity"
        action={{
          label: "Create Project",
          onClick: () => navigate("/projects?action=new"),
        }}
        mood="growth"
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
            dataKey="projectName" 
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
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
            stackId="project"
            fill="hsl(var(--primary))" 
            radius={[0, 0, 4, 4]}
          />
          <Bar 
            dataKey="notes" 
            name="Notes"
            stackId="project"
            fill="hsl(var(--secondary))" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 