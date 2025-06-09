export interface Note {
  id: string;
  user_id: string;
  learning_project_id: string | null;
  content: string;
  title: string | null;
  tags: string[];
  meta_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  learning_project_name?: string | null; // Only available in GET /{note_id}
}

export interface NoteCreate {
  content: string; // Required: min 1 character
  title?: string; // Optional: max 255 characters
  tags?: string[]; // Optional: default empty array
  meta_data?: Record<string, any>; // Optional: default empty object
  learning_project_id?: string; // Optional: link to learning project
}

export interface NoteUpdate {
  content?: string; // Optional: min 1 character if provided
  title?: string | null; // Optional: max 255 characters, null to remove
  tags?: string[]; // Optional: replaces existing tags
  meta_data?: Record<string, any>; // Optional: replaces existing metadata
  learning_project_id?: string | null; // Optional: null to unlink
}

export interface NoteFilters {
  skip?: number; // Pagination: number of records to skip (default: 0, min: 0)
  limit?: number; // Pagination: max records to return (default: 100, min: 1, max: 100)
  learning_project_id?: string; // Filter by learning project UUID
  tags?: string[]; // Filter notes containing any of these tags
  q?: string; // Search query for title/content (case-insensitive, max 255 chars)
} 