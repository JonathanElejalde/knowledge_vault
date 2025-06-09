import api from '@/lib/api/axios';
import type { Category } from './types/learningProjects';

export const categoriesApi = {
  /**
   * Get all categories
   */
  list: async (): Promise<Category[]> => {
    try {
      const response = await api.get<Category[]>('/categories/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new category
   */
  create: async (data: { name: string; description?: string }): Promise<Category> => {
    try {
      const response = await api.post<Category>('/categories/', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
}; 