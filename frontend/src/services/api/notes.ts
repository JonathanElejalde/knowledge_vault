import api from '@/lib/api/axios';
import type {
  Note,
  NoteCreate,
  NoteUpdate,
  NoteFilters,
} from './types/notes';

export const notesApi = {
  /**
   * Create a new note
   */
  create: async (data: NoteCreate): Promise<Note> => {
    try {
      const response = await api.post<Note>('/notes/', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get a list of notes with optional filters and pagination
   */
  list: async (filters?: NoteFilters): Promise<Note[]> => {
    try {
      const params: Record<string, any> = {};
      if (filters?.skip !== undefined) params.skip = filters.skip;
      if (filters?.limit !== undefined) params.limit = filters.limit;
      if (filters?.learning_project_id) params.learning_project_id = filters.learning_project_id;
      if (filters?.q) params.q = filters.q;
      
      // Handle tags array - can be specified multiple times
      if (filters?.tags && filters.tags.length > 0) {
        // For multiple tags, we need to add each as a separate parameter
        filters.tags.forEach(tag => {
          if (!params.tags) params.tags = [];
          params.tags.push(tag);
        });
      }

      const response = await api.get<Note[]>('/notes/', {
        params,
        paramsSerializer: {
          indexes: null // This allows multiple values for the same parameter name
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get a specific note by ID
   */
  get: async (id: string): Promise<Note> => {
    try {
      const response = await api.get<Note>(`/notes/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update a note
   */
  update: async (id: string, data: NoteUpdate): Promise<Note> => {
    try {
      const response = await api.put<Note>(`/notes/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a note
   */
  delete: async (id: string): Promise<Note> => {
    try {
      const response = await api.delete<Note>(`/notes/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
}; 