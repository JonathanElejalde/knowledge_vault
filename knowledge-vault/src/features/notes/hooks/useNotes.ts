import { useState, useCallback, useMemo, useEffect } from 'react';
import { notesApi } from '@/services/api/notes';
import { useNotesData, triggerNotesRefresh } from './useNotesData';
import type { 
  Note, 
  NoteCreate, 
  NoteUpdate,
  NoteFilters 
} from '@/services/api/types/notes';

// Debounce utility for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface UseNotesState {
  // Data
  notes: Note[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  
  // Filters
  searchQuery: string;
  selectedProjectId: string | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  loadMore: () => Promise<void>;
  createNote: (data: NoteCreate) => Promise<Note>;
  updateNote: (id: string, data: NoteUpdate) => Promise<Note>;
  deleteNote: (id: string) => Promise<Note>;
  refreshNotes: () => Promise<void>;
}

export function useNotes(): UseNotesState {
  // Local state for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Build filters object
  const filters = useMemo((): NoteFilters => {
    const filterObj: NoteFilters = {};
    
    if (selectedProjectId) {
      filterObj.learning_project_id = selectedProjectId;
    }
    
    if (debouncedSearchQuery.trim()) {
      filterObj.q = debouncedSearchQuery.trim();
    }
    
    return filterObj;
  }, [selectedProjectId, debouncedSearchQuery]);
  
  // Get notes data with current filters
  const { 
    notes, 
    isLoading, 
    isLoadingMore,
    hasMore,
    error, 
    loadMore,
    refreshNotes: refreshNotesData 
  } = useNotesData(filters);
  
  // Action: Create note
  const createNote = useCallback(async (data: NoteCreate): Promise<Note> => {
    try {
      const newNote = await notesApi.create(data);
      // Trigger refresh for all components
      triggerNotesRefresh();
      return newNote;
    } catch (error) {
      throw error;
    }
  }, []);
  
  // Action: Update note
  const updateNote = useCallback(async (id: string, data: NoteUpdate): Promise<Note> => {
    try {
      const updatedNote = await notesApi.update(id, data);
      // Trigger refresh for all components
      triggerNotesRefresh();
      return updatedNote;
    } catch (error) {
      throw error;
    }
  }, []);
  
  // Action: Delete note
  const deleteNote = useCallback(async (id: string): Promise<Note> => {
    try {
      const deletedNote = await notesApi.delete(id);
      // Trigger refresh for all components
      triggerNotesRefresh();
      return deletedNote;
    } catch (error) {
      throw error;
    }
  }, []);
  
  // Action: Refresh notes
  const refreshNotes = useCallback(async (): Promise<void> => {
    await refreshNotesData();
  }, [refreshNotesData]);

  return {
    // Data
    notes,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    
    // Filters
    searchQuery,
    selectedProjectId,
    
    // Actions
    setSearchQuery,
    setSelectedProjectId,
    loadMore,
    createNote,
    updateNote,
    deleteNote,
    refreshNotes,
  };
} 