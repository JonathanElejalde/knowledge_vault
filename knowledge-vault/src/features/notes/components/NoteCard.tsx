import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { FileText, Tag } from 'lucide-react';
import { formatDate } from '@/lib/utils/dateUtils';
import type { Note } from '@/services/api/types/notes';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {

  // Truncate content for preview
  const getContentPreview = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors group"
      onClick={onClick}
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
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2 group-hover:text-foreground transition-colors" />
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
  );
} 