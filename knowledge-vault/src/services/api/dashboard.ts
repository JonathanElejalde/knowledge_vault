import api from '@/lib/api/axios';
import type { 
  DashboardData, 
  DashboardStats, 
  ProjectStats, 
  DailyActivity, 
  SessionTime,
  DashboardFilters 
} from './types/dashboard';

export const dashboardApi = {
  /**
   * Get complete dashboard data in a single response
   */
  async getDashboardData(filters?: DashboardFilters): Promise<DashboardData> {
    const response = await api.get('/dashboard/', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get dashboard statistics only
   */
  async getStats(filters?: DashboardFilters): Promise<DashboardStats> {
    const response = await api.get('/dashboard/stats', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get project statistics
   */
  async getProjectStats(filters?: DashboardFilters): Promise<ProjectStats[]> {
    const response = await api.get('/dashboard/projects', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get daily activity data
   */
  async getDailyActivity(filters?: DashboardFilters): Promise<DailyActivity[]> {
    const response = await api.get('/dashboard/activity', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get session times data
   */
  async getSessionTimes(filters?: DashboardFilters): Promise<SessionTime[]> {
    const response = await api.get('/dashboard/session-times', {
      params: filters,
    });
    return response.data;
  },
}; 