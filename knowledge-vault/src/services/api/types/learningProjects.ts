export interface LearningProject {
  id: string;
  user_id: string;
  name: string;
  category_name: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  description?: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
  sessions_count: number;
}

export interface LearningProjectCreate {
  name: string;
  category_name?: string;
  description?: string;
  status?: 'in_progress' | 'completed' | 'abandoned';
}

export interface LearningProjectUpdate {
  name?: string;
  category_name?: string;
  description?: string;
  status?: 'in_progress' | 'completed' | 'abandoned';
}

export interface LearningProjectFilters {
  status?: 'in_progress' | 'completed' | 'abandoned';
  category?: string; // Keep as alias for category_name in filters
  q?: string; // Search query parameter
  skip?: number; // Pagination: number of records to skip
  limit?: number; // Pagination: maximum number of records to return
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  meta_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
} 