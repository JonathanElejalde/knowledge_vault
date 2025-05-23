export interface LearningProject {
  id: string;
  user_id: string;
  name: string;
  category: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface LearningProjectCreate {
  name: string;
  category: string;
  description?: string;
  status?: 'in_progress' | 'completed' | 'abandoned';
}

export interface LearningProjectUpdate {
  name?: string;
  category?: string;
  description?: string;
  status?: 'in_progress' | 'completed' | 'abandoned';
}

export interface LearningProjectFilters {
  status?: 'in_progress' | 'completed' | 'abandoned';
  category?: string;
  search?: string;
} 