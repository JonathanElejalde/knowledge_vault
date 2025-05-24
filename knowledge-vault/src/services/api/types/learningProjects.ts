export interface LearningProject {
  id: string;
  user_id: string;
  name: string;
  category_name: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  description?: string;
  created_at: string;
  updated_at: string;
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
  search?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  meta_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
} 