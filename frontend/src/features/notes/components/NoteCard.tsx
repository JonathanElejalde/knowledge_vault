import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/atoms/DropdownMenu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/atoms/Dialog';
import { Tag, MoreVertical, Edit, Trash2, Loader2, ExternalLink, Target } from 'lucide-react';
import { formatUTCToLocalDate } from '@/lib/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { Note } from '@/services/api/types/notes';

interface NoteCardProps {
  note: Note;
  projectName?: string;
  onEdit?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onView?: (note: Note) => void;
}

/**
 * NoteCard - Deep Focus Design
 * 
 * Clean card with subtle hover effects and content mood styling.
 */
export function NoteCard({ note, projectName, onEdit, onDelete, onView }: NoteCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(note);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete(note.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete note:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const handleView = () => {
    onView?.(note);
  };

  // Truncate content for preview
  const getContentPreview = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      
      if (e.ctrlKey || e.metaKey) {
        const noteUrl = `/notes/${note.id}`;
        window.open(noteUrl, '_blank');
        return;
      }
      
      onView?.(note);
    }
    
    if (e.button === 1) {
      e.preventDefault();
      const noteUrl = `/notes/${note.id}`;
      window.open(noteUrl, '_blank');
    }
  };

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <a
        href={`/notes/${note.id}`}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView?.(note);
          }
        }}
        aria-label={`View note: ${note.title || 'Untitled Note'}`}
        className="block no-underline"
      >
        <Card 
          interactive
          className="group"
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Meta row: Project + Date + Match score */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs text-text-tertiary">
                    {projectName && (
                      <span className="text-accent-primary font-medium">{projectName}</span>
                    )}
                    {projectName && ' · '}
                    {formatUTCToLocalDate(note.updated_at)}
                  </span>
                  
                  {/* Relevance Score - semantic search results */}
                  {note.similarity_score !== null && note.similarity_score !== undefined && note.similarity_score > 0 && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-2 py-0.5 flex items-center gap-1",
                        "bg-accent-primary-subtle border-accent-primary/30 text-accent-primary"
                      )}
                    >
                      <Target className="h-2.5 w-2.5" />
                      {Math.round(note.similarity_score * 100)}% match
                    </Badge>
                  )}
                </div>
                
                {/* Title */}
                <h3 className="text-base font-semibold text-text-primary line-clamp-2 leading-snug">
                  {note.title || 'Untitled Note'}
                </h3>
              </div>
              
              {/* Options Dropdown - appears on hover */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleOptionsClick}
                    aria-label="Note options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {onView && (
                    <DropdownMenuItem onClick={handleView}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Note
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={handleDeleteClick} 
                      className="text-semantic-danger focus:text-semantic-danger"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Content preview */}
            <p className="text-sm text-text-secondary line-clamp-2 mb-3">
              {getContentPreview(note.content)}
            </p>
            
            {/* Tags */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {note.tags.slice(0, 4).map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="text-[10px] px-2 py-0.5 flex items-center gap-1"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > 4 && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    +{note.tags.length - 4} more
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </a>

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
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
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