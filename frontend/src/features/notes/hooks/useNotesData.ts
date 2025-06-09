import { useState, useEffect, useCallback, useRef } from 'react';
import { notesApi } from '@/services/api/notes';
import { getCachedApiCall, clearApiCache } from './useApiCache';
import type { Note, NoteFilters } from '@/services/api/types/notes';

// Global event emitter for notes updates
class NotesEventEmitter {
  private listeners: (() => void)[] = [];

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  emit() {
    this.listeners.forEach(callback => callback());
  }
}

const notesEventEmitter = new NotesEventEmitter();

// Export function to trigger notes refresh from other hooks/components
export const triggerNotesRefresh = () => {
  // Clear the cache to force fresh data
  clearApiCache('notes-list');
  notesEventEmitter.emit();
};

// Constants for pagination
const INITIAL_PAGE_SIZE = 20; // Show more notes initially since they're smaller cards
const LOAD_MORE_PAGE_SIZE = 10; // Load more when scrolling

export function useNotesData(filters?: NoteFilters) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Track if we're in the middle of a filter change to reset pagination
  const filtersRef = useRef<NoteFilters | undefined>(filters);
  const isFilterChange = JSON.stringify(filters) !== JSON.stringify(filtersRef.current);

  // Create a cache key that includes filters to ensure proper caching per filter combination
  const cacheKey = `notes-list-${JSON.stringify(filters || {})}`;

  const fetchNotes = useCallback(async (page: number = 0, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setNotes([]); // Clear existing notes for fresh load
    }

    try {
      const pageSize = page === 0 ? INITIAL_PAGE_SIZE : LOAD_MORE_PAGE_SIZE;
      const skip = page === 0 ? 0 : INITIAL_PAGE_SIZE + (page - 1) * LOAD_MORE_PAGE_SIZE;
      
      const filtersWithPagination = {
        ...filters,
        skip,
        limit: pageSize,
      };

      // Use different cache keys for different pages to avoid conflicts
      const pageCacheKey = `${cacheKey}-page-${page}`;
      const data = await getCachedApiCall(pageCacheKey, () => 
        notesApi.list(filtersWithPagination)
      );

      if (append) {
        setNotes(prev => [...prev, ...data]);
      } else {
        setNotes(data);
      }

      // Check if we have more data to load
      setHasMore(data.length === pageSize);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      setError(err as Error);
      if (!append) {
        setNotes([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [cacheKey, filters]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    const nextPage = currentPage + 1;
    await fetchNotes(nextPage, true);
  }, [fetchNotes, currentPage, isLoadingMore, hasMore]);

  const refreshNotes = useCallback(async () => {
    setCurrentPage(0);
    setHasMore(true);
    await fetchNotes(0, false);
  }, [fetchNotes]);

  // Reset pagination when filters change
  useEffect(() => {
    if (isFilterChange) {
      filtersRef.current = filters;
      setCurrentPage(0);
      setHasMore(true);
      fetchNotes(0, false);
    }
  }, [filters, isFilterChange, fetchNotes]);

  // Initial load
  useEffect(() => {
    if (!isFilterChange) {
      fetchNotes(0, false);
    }
  }, [fetchNotes, isFilterChange]);

  // Listen for notes update events
  useEffect(() => {
    const unsubscribe = notesEventEmitter.subscribe(() => {
      // Clear cache for all note-related keys when refresh is triggered
      clearApiCache();
      refreshNotes();
    });
    return unsubscribe;
  }, [refreshNotes]);

  return { 
    notes, 
    isLoading, 
    isLoadingMore,
    error, 
    hasMore,
    loadMore,
    refreshNotes 
  };
} 