// Pomodoro preferences types based on backend documentation
export interface PomodoroPreferences {
  work_duration: number; // in minutes
  break_duration: number; // in minutes
  long_break_duration: number; // in minutes
  long_break_interval: number; // number of work sessions before long break
}

// Session types based on backend documentation
export interface PomodoroSession {
  id: string;
  user_id: string;
  learning_project_id?: string;
  start_time: string;
  end_time?: string;
  work_duration: number; // in minutes
  break_duration: number; // in minutes
  actual_duration?: number; // in minutes
  session_type: 'work' | 'break';
  status: 'in_progress' | 'completed' | 'abandoned';
  title?: string;
  meta_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Session with project details for list responses
export interface PomodoroSessionWithProject extends PomodoroSession {
  learning_project?: {
    id: string;
    name: string;
    category: string;
    status: string;
  };
}

// Request types for starting sessions
export interface SessionStartRequest {
  learning_project_id?: string;
  title?: string;
  session_type: 'work' | 'break';
  work_duration: number; // in minutes
  break_duration: number; // in minutes
}

// Request types for completing sessions
export interface SessionCompleteRequest {
  actual_duration?: number; // in minutes
}

// Request types for abandoning sessions
export interface SessionAbandonRequest {
  actual_duration?: number; // in minutes
  reason?: string;
}

// Filters for session list
export interface SessionFilters {
  learning_project_id?: string;
  session_type?: 'work' | 'break';
  status?: 'in_progress' | 'completed' | 'abandoned';
  skip?: number;
  limit?: number;
}

// Statistics types (for future implementation - using defaults for now)
export interface PomodoroStatistics {
  total_focus_time: number; // in minutes
  completed_sessions: number;
  total_sessions: number;
  weekly_goal: number; // in minutes
  weekly_progress: number; // in minutes
}

// Pomodoro session summary for project grouping (from /pomodoro/sessions/summary)
export interface PomodoroSessionSummary {
  project_id: string | null;
  project_name: string;
  total_duration_minutes: number;
  first_session_date: string; // ISO 8601
  last_session_date: string;  // ISO 8601
  session_count: number;
} 