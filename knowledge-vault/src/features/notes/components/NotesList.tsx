import React from 'react';
import { NoteCard } from './NoteCard';
import { Skeleton } from '@/components/atoms/Skeleton';
import { Button } from '@/components/atoms/Button';
import { Loader2 } from 'lucide-react';
import type { Note } from '@/services/api/types/notes';

interface NotesListProps {
  notes: Note[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  onLoadMore: () => void;
  onNoteClick?: (note: Note) => void;
}

export function NotesList({
  notes,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  onLoadMore,
  onNoteClick,
}: NotesListProps) {
  // Loading skeleton for initial load
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <Skeleton className="h-3 w-32 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-destructive mb-2">Failed to load notes</div>
        <div className="text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred'}
        </div>
      </div>
    );
  }

  // Empty state
  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">No notes found</div>
        <div className="text-sm text-muted-foreground">
          Try adjusting your filters or create your first note
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
          onClick={() => onNoteClick?.(note)}
        />
      ))}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
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
        <div className="text-center py-4 text-sm text-muted-foreground">
          You've reached the end of your notes
        </div>
      )}
    </div>
  );
} 