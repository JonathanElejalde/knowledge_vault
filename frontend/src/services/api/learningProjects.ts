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
    const response = await api.post<LearningProject>('/learning-projects/', data);
    return response.data;
  },

  /**
   * Get a list of learning projects with optional filters and pagination
   */
  list: async (filters?: LearningProjectFilters): Promise<LearningProject[]> => {
    // Map the filters to match backend parameter names
    const params: Record<string, string | number> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.category) params.category = filters.category;
    if (filters?.q) params.q = filters.q;
    if (filters?.skip !== undefined) params.skip = filters.skip;
    if (filters?.limit !== undefined) params.limit = filters.limit;

    const response = await api.get<LearningProject[]>('/learning-projects/', {
      params,
    });
    return response.data;
  },

  /**
   * Get a specific learning project by ID
   */
  get: async (id: string): Promise<LearningProject> => {
    const response = await api.get<LearningProject>(`/learning-projects/${id}`);
    return response.data;
  },

  /**
   * Update a learning project
   */
  update: async (
    id: string,
    data: LearningProjectUpdate
  ): Promise<LearningProject> => {
    const response = await api.put<LearningProject>(`/learning-projects/${id}`, data);
    return response.data;
  },

  /**
   * Delete a learning project
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/learning-projects/${id}`);
  },
};
