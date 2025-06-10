import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  isSemanticSearch: boolean;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  setIsSemanticSearch: (isSemanticSearch: boolean) => void;
  triggerSemanticSearch: () => void;
  loadMore: () => Promise<void>;
  createNote: (data: NoteCreate) => Promise<Note>;
  updateNote: (id: string, data: NoteUpdate) => Promise<Note>;
  deleteNote: (id: string) => Promise<Note>;
  refreshNotes: () => Promise<void>;
}

export function useNotes(): UseNotesState {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get filter values from URL search parameters
  const urlSearchQuery = searchParams.get('search') || '';
  const selectedProjectId = searchParams.get('project') || null;
  const isSemanticSearch = searchParams.get('semantic') === 'true';
  
  // Local state for responsive typing (not connected to URL until debounced)
  const [localSearchQuery, setLocalSearchQuery] = useState(urlSearchQuery);
  
  // Sync local state with URL when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setLocalSearchQuery(urlSearchQuery);
    // For semantic search, also restore the manual query if it exists in URL
    if (isSemanticSearch && urlSearchQuery) {
      setManualSemanticQuery(urlSearchQuery);
    }
  }, [urlSearchQuery, isSemanticSearch]);
  
  // For semantic search, we don't want auto-debouncing - only manual triggers
  // For keyword search, we debounce the local query and then update URL
  const debouncedKeywordQuery = useDebounce(localSearchQuery, 300);
  const [manualSemanticQuery, setManualSemanticQuery] = useState<string>('');
  
  // Build filters object
  const filters = useMemo((): NoteFilters => {
    const filterObj: NoteFilters = {};
    
    if (selectedProjectId) {
      filterObj.learning_project_id = selectedProjectId;
    }
    
    if (isSemanticSearch) {
      // For semantic search, only use manually triggered queries
      // Don't include any search parameters until manually triggered
      if (manualSemanticQuery.trim()) {
        filterObj.semantic_q = manualSemanticQuery.trim();
      }
      // Note: We deliberately exclude searchQuery/debouncedKeywordQuery from dependencies
      // when in semantic mode to prevent unnecessary API calls while typing
    } else {
      // For keyword search, use debounced auto-triggered queries
      if (debouncedKeywordQuery.trim()) {
        filterObj.q = debouncedKeywordQuery.trim();
      }
    }
    
    return filterObj;
  }, [
    selectedProjectId, 
    // Only include search-related dependencies when not in semantic mode
    // or when semantic search has been manually triggered
    ...(isSemanticSearch 
      ? [manualSemanticQuery] // Only manual semantic query affects filters
      : [debouncedKeywordQuery] // Only keyword query affects filters
    )
  ]);
  
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
  
  // Update URL when debounced keyword query changes (only for keyword search)
  useEffect(() => {
    if (!isSemanticSearch) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        if (debouncedKeywordQuery.trim()) {
          newParams.set('search', debouncedKeywordQuery);
        } else {
          newParams.delete('search');
        }
        return newParams;
      });
    }
  }, [debouncedKeywordQuery, isSemanticSearch, setSearchParams]);
  
  // Action: Set search query (updates local state immediately for responsiveness)
  const setSearchQuery = useCallback((query: string) => {
    setLocalSearchQuery(query);
  }, []);
  
  // Action: Set selected project (updates URL)
  const setSelectedProjectId = useCallback((projectId: string | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (projectId) {
        newParams.set('project', projectId);
      } else {
        newParams.delete('project');
      }
      return newParams;
    });
  }, [setSearchParams]);
  
  // Action: Set semantic search (updates URL)
  const setIsSemanticSearch = useCallback((isSemanticSearch: boolean) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('semantic', isSemanticSearch.toString());
      return newParams;
    });
    // Clear manual semantic query when switching modes
    setManualSemanticQuery('');
  }, [setSearchParams]);
  
  // Action: Trigger semantic search manually
  const triggerSemanticSearch = useCallback(() => {
    if (localSearchQuery.trim()) {
      setManualSemanticQuery(localSearchQuery.trim());
      // Also update URL for semantic search
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('search', localSearchQuery.trim());
        return newParams;
      });
    }
  }, [localSearchQuery, setSearchParams]);
  
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
    searchQuery: localSearchQuery, // Return local state for immediate UI responsiveness
    selectedProjectId,
    isSemanticSearch,
    
    // Actions
    setSearchQuery,
    setSelectedProjectId,
    setIsSemanticSearch,
    triggerSemanticSearch,
    loadMore,
    createNote,
    updateNote,
    deleteNote,
    refreshNotes,
  };
} 