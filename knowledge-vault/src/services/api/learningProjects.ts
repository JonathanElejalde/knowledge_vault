import api from '@/lib/api/axios';
import type {
  LearningProject,
  LearningProjectCreate,
  LearningProjectUpdate,
  LearningProjectFilters,
} from './types/learningProjects';

export const learningProjectsApi = {
  /**
   * Create a new learning project
   */
  create: async (data: LearningProjectCreate): Promise<LearningProject> => {
    try {
      const response = await api.post<LearningProject>('/learning-projects/', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get a list of learning projects with optional filters
   */
  list: async (filters?: LearningProjectFilters): Promise<LearningProject[]> => {
    try {
      const response = await api.get<LearningProject[]>('/learning-projects/', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get a specific learning project by ID
   */
  get: async (id: string): Promise<LearningProject> => {
    try {
      const response = await api.get<LearningProject>(`/learning-projects/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update a learning project
   */
  update: async (
    id: string,
    data: LearningProjectUpdate
  ): Promise<LearningProject> => {
    try {
      const response = await api.put<LearningProject>(`/learning-projects/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a learning project
   */
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/learning-projects/${id}`);
    } catch (error) {
      throw error;
    }
  },
}; 