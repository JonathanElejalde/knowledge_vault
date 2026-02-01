// Dashboard API types based on backend documentation

export type DashboardPeriod = '7d' | '2w' | '4w' | '3m' | '1y' | 'all';

export interface DashboardStats {
  total_focus_time: number; // Total focus time in minutes
  notes_created: number; // Number of notes created
  active_projects: number; // Number of projects with status 'in_progress'
  completed_projects: number; // Number of projects with status 'completed'
}

export interface ProjectStats {
  project_id: string;
  project_name: string;
  sessions_count: number; // Number of sessions for this project
  notes_count: number; // Number of notes for this project
}

export interface DailyActivity {
  date: string; // Local date: "2024-01-15" (in user's timezone)
  sessions_count: number; // Sessions on this local date
  notes_count: number; // Notes created on this local date
}

export interface SessionTime {
  start_time: string; // Full datetime when session started: "2024-01-15T09:00:00Z"
  duration: number | null; // Actual duration in minutes (can be null)
  project_name: string | null; // Associated project name (can be null)
}

export interface FocusHeatmapCell {
  day_of_week: number; // 0=Monday, 6=Sunday
  hour: number; // 0-23
  total_minutes: number; // Total focus minutes in this slot
  session_count: number; // Number of sessions in this slot
}

export interface FocusHeatmapData {
  cells: FocusHeatmapCell[]; // Sparse array of cells with data
  max_minutes: number; // Maximum minutes in any cell (for normalization)
}

export interface DashboardData {
  stats: DashboardStats;
  project_stats: ProjectStats[];
  daily_activity: DailyActivity[];
  session_times: SessionTime[];
  focus_heatmap: FocusHeatmapData;
}

export interface DashboardFilters {
  period?: DashboardPeriod;
} 