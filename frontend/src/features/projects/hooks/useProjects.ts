import { useState, useCallback, useMemo, useEffect } from 'react';
import { learningProjectsApi } from '@/services/api/learningProjects';
import { useProjectsData, triggerProjectsRefresh } from './useProjectsData';
import type { 
  LearningProject, 
  LearningProjectCreate, 
  LearningProjectUpdate,
  LearningProjectFilters 
} from '@/services/api/types/learningProjects';

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

interface UseProjectsState {
  // Data
  projects: LearningProject[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  
  // Filters
  searchQuery: string;
  activeTab: 'all' | 'in_progress' | 'completed' | 'abandoned';
  
  // Actions
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: 'all' | 'in_progress' | 'completed' | 'abandoned') => void;
  loadMore: () => Promise<void>;
  createProject: (data: LearningProjectCreate) => Promise<LearningProject>;
  updateProject: (id: string, data: LearningProjectUpdate) => Promise<LearningProject>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

export function useProjects(): UseProjectsState {
  // Local state for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'completed' | 'abandoned'>('in_progress');
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Build filters object
  const filters = useMemo((): LearningProjectFilters => {
    const filterObj: LearningProjectFilters = {};
    
    if (activeTab !== 'all') {
      filterObj.status = activeTab;
    }
    
    if (debouncedSearchQuery.trim()) {
      filterObj.q = debouncedSearchQuery.trim();
    }
    
    return filterObj;
  }, [activeTab, debouncedSearchQuery]);
  
  // Get projects data with current filters
  const { 
    projects, 
    isLoading, 
    isLoadingMore,
    hasMore,
    error, 
    loadMore,
    refreshProjects: refreshProjectsData 
  } = useProjectsData(filters);
  
  // Action: Create project
  const createProject = useCallback(async (data: LearningProjectCreate): Promise<LearningProject> => {
    try {
      const newProject = await learningProjectsApi.create(data);
      // Trigger refresh for all components
      triggerProjectsRefresh();
      return newProject;
    } catch (error) {
      throw error;
    }
  }, []);
  
  // Action: Update project
  const updateProject = useCallback(async (id: string, data: LearningProjectUpdate): Promise<LearningProject> => {
    try {
      const updatedProject = await learningProjectsApi.update(id, data);
      // Trigger refresh for all components
      triggerProjectsRefresh();
      return updatedProject;
    } catch (error) {
      throw error;
    }
  }, []);
  
  // Action: Delete project
  const deleteProject = useCallback(async (id: string): Promise<void> => {
    try {
      await learningProjectsApi.delete(id);
      // Trigger refresh for all components
      triggerProjectsRefresh();
    } catch (error) {
      throw error;
    }
  }, []);
  
  // Action: Refresh projects
  const refreshProjects = useCallback(async (): Promise<void> => {
    await refreshProjectsData();
  }, [refreshProjectsData]);

  return {
    // Data
    projects,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    
    // Filters
    searchQuery,
    activeTab,
    
    // Actions
    setSearchQuery,
    setActiveTab,
    loadMore,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
  };
} 