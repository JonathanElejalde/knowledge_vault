import React from 'react';
import { NoteCard } from './NoteCard';
import { Card } from '@/components/atoms/Card';
import { Skeleton } from '@/components/atoms/Skeleton';
import { Button } from '@/components/atoms/Button';
import { Loader2, FilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Note } from '@/services/api/types/notes';

interface NotesListProps {
  notes: Note[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  onLoadMore: () => void;
  onNoteClick?: (note: Note) => void;
  onNoteEdit?: (note: Note) => void;
  onNoteDelete?: (noteId: string) => Promise<void>;
  onCreateNew?: () => void;
}

/**
 * NotesList - Deep Focus Design
 * 
 * List layout with empty state and infinite scroll.
 */
export function NotesList({
  notes,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  onLoadMore,
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
  onCreateNew,
}: NotesListProps) {
  // Loading skeleton for initial load
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <Skeleton className="h-3 w-40 mb-3" />
                <Skeleton className="h-5 w-64" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-semantic-danger mb-2">Failed to load notes</p>
          <p className="text-sm text-text-tertiary">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (notes.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-16",
        "bg-surface-sunken/50 dark:bg-surface-raised/30 rounded-xl",
        "border border-dashed border-border-subtle",
        "relative overflow-hidden"
      )}>
        {/* Subtle dot pattern background */}
        <div 
          className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--accent-primary)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        
        <div className="text-center relative z-10 px-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-surface-sunken dark:bg-surface-raised mb-4">
            <FilePlus className="h-7 w-7 text-accent-primary" strokeWidth={1.5} />
          </div>
          
          {/* Title */}
          <h4 className="text-base font-medium text-text-primary mb-2">
            No notes yet
          </h4>
          
          {/* Description */}
          <p className="text-sm text-text-tertiary max-w-sm mx-auto mb-6">
            Start capturing your learning insights. Create notes to organize your knowledge and make it searchable.
          </p>
          
          {/* CTA */}
          {onCreateNew && (
            <Button onClick={onCreateNew} className="gap-2">
              <FilePlus className="h-4 w-4" />
              Create Your First Note
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Notes list */}
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          projectName={note.learning_project_name || undefined}
          onView={() => onNoteClick?.(note)}
          onEdit={onNoteEdit}
          onDelete={onNoteDelete}
        />
      ))}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="min-w-32"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && notes.length > 0 && (
        <div className="text-center py-6">
          <p className="text-text-muted text-xs">
            End of notes
          </p>
        </div>
      )}
    </div>
  );
} 