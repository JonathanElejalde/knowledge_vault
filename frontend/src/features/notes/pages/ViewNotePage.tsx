import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { MarkdownRenderer } from '@/components/atoms/MarkdownRenderer';
import { ArrowLeft, Edit, Trash2, Tag, Calendar, User, Loader2 } from 'lucide-react';
import { notesApi } from '@/services/api/notes';
import { formatDate } from '@/lib/utils/dateUtils';
import type { Note } from '@/services/api/types/notes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/Dialog';

export default function ViewNotePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch the specific note by ID
  useEffect(() => {
    const fetchNote = async () => {
      if (!id) {
        navigate('/notes');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const fetchedNote = await notesApi.get(id);
        setNote(fetchedNote);
      } catch (err) {
        console.error('Failed to fetch note:', err);
        setError('Failed to load note');
        // Don't redirect immediately, let user see the error
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [id, navigate]);

  const handleEdit = () => {
    if (note) {
      navigate(`/notes/edit/${note.id}`);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    
    try {
      setIsDeleting(true);
      await notesApi.delete(note.id);
      // Navigate back to notes list, preserving any search parameters from the referrer
      const referrerSearchParams = location.state?.from?.search || '';
      navigate(`/notes${referrerSearchParams}`);
    } catch (error) {
      console.error('Failed to delete note:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBack = () => {
    // Try to go back in history first, but fallback to notes list if no history
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback: navigate to notes list, preserving any search parameters from the referrer
      const referrerSearchParams = location.state?.from?.search || '';
      navigate(`/notes${referrerSearchParams}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading note...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Error loading note</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Notes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Note not found
  if (!note) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Note not found</h2>
            <p className="text-muted-foreground mb-4">
              The note you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Notes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Notes
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Note Content */}
        <article className="bg-card rounded-lg border shadow-sm">
          {/* Note Header */}
          <header className="p-6 border-b">
            <h1 className="text-3xl font-bold mb-4">
              {note.title || 'Untitled Note'}
            </h1>
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Updated {formatDate(note.updated_at)}</span>
              </div>
              
              {note.learning_project_name && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Project: {note.learning_project_name}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="text-xs px-2 py-1 flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* Note Body */}
          <div className="p-6">
            {note.content ? (
              <MarkdownRenderer 
                content={note.content} 
                variant="default"
                className="min-h-[200px]"
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>This note is empty.</p>
                <Button 
                  variant="outline" 
                  onClick={handleEdit}
                  className="mt-4 gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Add content
                </Button>
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{note.title || 'Untitled Note'}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 