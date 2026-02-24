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
    const response = await api.post<Note>('/notes/', data);
    return response.data;
  },

  /**
   * Get a list of notes with optional filters and pagination
   */
  list: async (filters?: NoteFilters): Promise<Note[]> => {
    const params: Record<string, string | number | string[]> = {};
    if (filters?.skip !== undefined) params.skip = filters.skip;
    if (filters?.limit !== undefined) params.limit = filters.limit;
    if (filters?.learning_project_id) params.learning_project_id = filters.learning_project_id;
    if (filters?.q) params.q = filters.q;
    if (filters?.semantic_q) params.semantic_q = filters.semantic_q;
    
    if (filters?.tags && filters.tags.length > 0) {
      params.tags = [...filters.tags];
    }

    const response = await api.get<Note[]>('/notes/', {
      params,
      paramsSerializer: {
        indexes: null // This allows multiple values for the same parameter name
      }
    });
    return response.data;
  },

  /**
   * Get a specific note by ID
   */
  get: async (id: string): Promise<Note> => {
    const response = await api.get<Note>(`/notes/${id}`);
    return response.data;
  },

  /**
   * Update a note
   */
  update: async (id: string, data: NoteUpdate): Promise<Note> => {
    const response = await api.put<Note>(`/notes/${id}`, data);
    return response.data;
  },

  /**
   * Delete a note
   */
  delete: async (id: string): Promise<Note> => {
    const response = await api.delete<Note>(`/notes/${id}`);
    return response.data;
  },
};
