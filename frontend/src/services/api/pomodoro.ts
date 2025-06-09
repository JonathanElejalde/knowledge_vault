import api from '@/lib/api/axios';
import type {
  PomodoroPreferences,
  PomodoroSession,
  PomodoroSessionWithProject,
  SessionStartRequest,
  SessionCompleteRequest,
  SessionAbandonRequest,
  SessionFilters,
  PomodoroStatistics,
  PomodoroSessionSummary,
  WeeklyStatisticsResponse,
} from './types/pomodoro';

export const pomodoroApi = {
  /**
   * Get user's Pomodoro preferences
   */
  getPreferences: async (): Promise<PomodoroPreferences> => {
    try {
      const response = await api.get<PomodoroPreferences>('/pomodoro/preferences');
      return response.data;
    } catch (error) {
      // Return default preferences if not found
      return {
        work_duration: 25,
        break_duration: 5,
        long_break_duration: 15,
        long_break_interval: 4,
      };
    }
  },

  /**
   * Update user's Pomodoro preferences
   */
  updatePreferences: async (preferences: Partial<PomodoroPreferences>): Promise<PomodoroPreferences> => {
    try {
      // Convert the preferences to a format that matches the backend schema
      const preferencesData = {
        work_duration: preferences.work_duration,
        break_duration: preferences.break_duration,
        long_break_duration: preferences.long_break_duration,
        long_break_interval: preferences.long_break_interval,
      };
      const response = await api.put<PomodoroPreferences>('/pomodoro/preferences', preferencesData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Start a new Pomodoro session
   */
  startSession: async (data: SessionStartRequest): Promise<PomodoroSession> => {
    try {
      const response = await api.post<PomodoroSession>('/pomodoro/sessions/start', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Complete a Pomodoro session
   */
  completeSession: async (sessionId: string, data?: SessionCompleteRequest): Promise<PomodoroSession> => {
    try {
      const response = await api.post<PomodoroSession>(
        `/pomodoro/sessions/${sessionId}/complete`,
        data || {}
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Abandon a Pomodoro session
   */
  abandonSession: async (sessionId: string, data?: SessionAbandonRequest): Promise<PomodoroSession> => {
    try {
      const response = await api.post<PomodoroSession>(
        `/pomodoro/sessions/${sessionId}/abandon`,
        data || {}
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get list of Pomodoro sessions with optional filters
   */
  getSessions: async (filters?: SessionFilters): Promise<PomodoroSessionWithProject[]> => {
    try {
      const response = await api.get<PomodoroSessionWithProject[]>('/pomodoro/sessions/', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get Pomodoro statistics (using defaults for now as endpoints don't exist yet)
   */
  getStatistics: async (): Promise<PomodoroStatistics> => {
    try {
      // TODO: Replace with actual API call when statistics endpoint is available
      // For now, we'll use default values as requested
      return {
        total_focus_time: 0,
        completed_sessions: 0,
        total_sessions: 0,
        weekly_goal: 900, // 15 hours in minutes
        weekly_progress: 0,
      };
    } catch (error) {
      // Return default statistics
      return {
        total_focus_time: 0,
        completed_sessions: 0,
        total_sessions: 0,
        weekly_goal: 900, // 15 hours in minutes
        weekly_progress: 0,
      };
    }
  },

  /**
   * Get summary of Pomodoro sessions grouped by project
   */
  getSessionSummary: async (params?: {
    period?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<PomodoroSessionSummary[]> => {
    try {
      const response = await api.get<PomodoroSessionSummary[]>('/pomodoro/sessions/summary', {
        params,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get weekly statistics for the current calendar week
   */
  getWeeklyStatistics: async (): Promise<WeeklyStatisticsResponse> => {
    try {
      const response = await api.get<WeeklyStatisticsResponse>('/pomodoro/statistics/weekly');
      return response.data;
    } catch (error) {
      // Return default weekly statistics if endpoint not available yet
      console.warn('Weekly statistics endpoint not available, using default values:', error);
      return {
        total_focus_time_minutes: 0,
        completed_sessions_count: 0,
        abandoned_sessions_count: 0,
        notes_count: 0,
        week_start_date: new Date().toISOString(),
        week_end_date: new Date().toISOString(),
      };
    }
  },
}; 