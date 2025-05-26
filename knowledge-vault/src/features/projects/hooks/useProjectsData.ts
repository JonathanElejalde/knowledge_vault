import { useState, useEffect, useCallback, useRef } from 'react';
import { learningProjectsApi } from '@/services/api/learningProjects';
import { getCachedApiCall, clearApiCache } from './useApiCache';
import type { LearningProject, LearningProjectFilters } from '@/services/api/types/learningProjects';

// Global event emitter for projects updates
class ProjectsEventEmitter {
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

const projectsEventEmitter = new ProjectsEventEmitter();

// Export function to trigger projects refresh from other hooks/components
export const triggerProjectsRefresh = () => {
  // Clear the cache to force fresh data
  clearApiCache('projects-list');
  projectsEventEmitter.emit();
};

// Constants for pagination
const INITIAL_PAGE_SIZE = 12; // Show 3 rows of 4 cards initially
const LOAD_MORE_PAGE_SIZE = 8; // Load 2 more rows when scrolling

export function useProjectsData(filters?: LearningProjectFilters) {
  const [projects, setProjects] = useState<LearningProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Track if we're in the middle of a filter change to reset pagination
  const filtersRef = useRef<LearningProjectFilters | undefined>(filters);
  const isFilterChange = JSON.stringify(filters) !== JSON.stringify(filtersRef.current);

  // Create a cache key that includes filters to ensure proper caching per filter combination
  const cacheKey = `projects-list-${JSON.stringify(filters || {})}`;

  const fetchProjects = useCallback(async (page: number = 0, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setProjects([]); // Clear existing projects for fresh load
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
        learningProjectsApi.list(filtersWithPagination)
      );

      if (append) {
        setProjects(prev => [...prev, ...data]);
      } else {
        setProjects(data);
      }

      // Check if we have more data to load
      setHasMore(data.length === pageSize);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      setError(err as Error);
      if (!append) {
        setProjects([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [cacheKey, filters]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    const nextPage = currentPage + 1;
    await fetchProjects(nextPage, true);
  }, [fetchProjects, currentPage, isLoadingMore, hasMore]);

  const refreshProjects = useCallback(async () => {
    setCurrentPage(0);
    setHasMore(true);
    await fetchProjects(0, false);
  }, [fetchProjects]);

  // Reset pagination when filters change
  useEffect(() => {
    if (isFilterChange) {
      filtersRef.current = filters;
      setCurrentPage(0);
      setHasMore(true);
      fetchProjects(0, false);
    }
  }, [filters, isFilterChange, fetchProjects]);

  // Initial load
  useEffect(() => {
    if (!isFilterChange) {
      fetchProjects(0, false);
    }
  }, [fetchProjects, isFilterChange]);

  // Listen for projects update events
  useEffect(() => {
    const unsubscribe = projectsEventEmitter.subscribe(() => {
      // Clear cache for all project-related keys when refresh is triggered
      clearApiCache();
      refreshProjects();
    });
    return unsubscribe;
  }, [refreshProjects]);

  return { 
    projects, 
    isLoading, 
    isLoadingMore,
    error, 
    hasMore,
    loadMore,
    refreshProjects 
  };
} 