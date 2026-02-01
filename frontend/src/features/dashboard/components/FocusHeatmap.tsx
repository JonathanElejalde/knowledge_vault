import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import type { FocusHeatmapData } from '@/services/api/types/dashboard';
import EmptyState from './EmptyState';
import { cn } from '@/lib/utils';

interface FocusHeatmapProps {
  data: FocusHeatmapData;
  className?: string;
}

// Days of week labels
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Hours to display (6am to 10pm)
const HOURS_START = 6;
const HOURS_END = 22;

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return 'No activity';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Transforms our API data into Nivo heatmap format.
 * 
 * Nivo expects: [{ id: 'row1', data: [{ x: 'col1', y: value }, ...] }, ...]
 * We have: [{ day_of_week: 0-6, hour: 0-23, total_minutes: number }, ...]
 * 
 * We'll create rows for each hour (6am-10pm) and columns for each day (Mon-Sun)
 */
function transformData(apiData: FocusHeatmapData) {
  // Build lookup map
  const cellMap = new Map<string, number>();
  for (const cell of apiData.cells) {
    cellMap.set(`${cell.day_of_week}-${cell.hour}`, cell.total_minutes);
  }

  // Create rows (hours) with columns (days)
  const rows = [];
  for (let hour = HOURS_START; hour <= HOURS_END; hour++) {
    const rowData = DAYS.map((day, dayIndex) => ({
      x: day,
      y: cellMap.get(`${dayIndex}-${hour}`) ?? 0,
    }));
    
    rows.push({
      id: formatHour(hour),
      data: rowData,
    });
  }

  return rows;
}

export default function FocusHeatmap({ data, className }: FocusHeatmapProps) {
  const navigate = useNavigate();

  const hasData = data.cells.length > 0 && data.max_minutes > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={Clock}
        title="No focus patterns yet"
        description="Start tracking sessions to see your productivity patterns."
        action={{
          label: "Start Focusing",
          onClick: () => navigate("/pomodoro"),
        }}
        mood="focus"
        className={className}
      />
    );
  }

  const heatmapData = transformData(data);

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveHeatMap
        data={heatmapData}
        margin={{ top: 30, right: 10, bottom: 30, left: 50 }}
        valueFormat={(value) => formatDuration(value as number)}
        axisTop={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
        }}
        axisBottom={null}
        axisRight={null}
        colors={{
          type: 'sequential',
          colors: [
            'hsl(207, 47%, 96%)',  // Lightest - almost white with blue tint
            'hsl(207, 47%, 89%)',  // palette-mist
            'hsl(205, 53%, 82%)',  // palette-steel
            'hsl(213, 47%, 72%)',  // Between steel and ocean
            'hsl(213, 47%, 64%)',  // palette-ocean
            'hsl(215, 50%, 52%)',  // palette-deep
          ],
          minValue: 0,
          maxValue: data.max_minutes || 60,
        }}
        emptyColor="hsl(195, 33%, 98%)"
        borderRadius={3}
        borderWidth={2}
        borderColor="hsl(0, 0%, 100%)"
        enableLabels={false}
        hoverTarget="cell"
        tooltip={({ cell }) => (
          <div className="bg-surface-base border border-border-subtle rounded-lg px-3 py-2 shadow-lg">
            <div className="font-medium text-text-primary text-sm">
              {cell.serieId} · {cell.data.x}
            </div>
            <div className="text-text-secondary text-xs mt-0.5">
              {formatDuration(cell.data.y as number)}
            </div>
          </div>
        )}
        legends={[
          {
            anchor: 'bottom',
            translateX: 0,
            translateY: 26,
            length: 200,
            thickness: 10,
            direction: 'row',
            tickPosition: 'after',
            tickSize: 3,
            tickSpacing: 4,
            tickOverlap: false,
            title: 'Focus time →',
            titleAlign: 'start',
            titleOffset: 4,
          },
        ]}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
}
