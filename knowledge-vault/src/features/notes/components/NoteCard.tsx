import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
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
import { FileText, Tag, MoreVertical, Edit, Trash2, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils/dateUtils';
import type { Note } from '@/services/api/types/notes';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
  onEdit?: (note: Note) => void;
  onDelete?: (noteId: string) => Promise<void>;
}

export function NoteCard({ note, onClick, onEdit, onDelete }: NoteCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Truncate content for preview
  const getContentPreview = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onEdit?.(note);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
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
      // Error handling - could be enhanced with toast notifications
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const handleCardClick = () => {
    onClick?.();
  };

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking options
  };

  return (
    <>
      <Card 
        className="cursor-pointer hover:bg-muted/50 transition-colors group relative"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">
                {note.learning_project_id && (
                  <>
                    {note.learning_project_name || note.learning_project_id} • {' '}
                  </>
                )}
                {formatDate(note.updated_at)}
              </div>
              <CardTitle className="text-lg line-clamp-2">
                {note.title || 'Untitled Note'}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <FileText className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              
              {/* Options Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleOptionsClick}
                    aria-label="Note options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDeleteClick} 
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-3 mb-3">
            {getContentPreview(note.content)}
          </CardDescription>
          
          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.slice(0, 4).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="text-xs px-2 py-0.5 flex items-center gap-1"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
              {note.tags.length > 4 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{note.tags.length - 4} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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