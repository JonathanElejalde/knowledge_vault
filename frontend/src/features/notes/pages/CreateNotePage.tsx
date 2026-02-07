import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NoteEditor } from '@/components/atoms/NoteEditor';
import { useNotes } from '../hooks/internal';
import type { NoteCreate } from '@/services/api/types/notes';

export default function EditCreateNotePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { createNote, updateNote, notes } = useNotes();
  
  // Find the note to edit if we're in edit mode
  const noteToEdit = id ? notes.find(note => note.id === id) : null;
  const isEditMode = !!id && !!noteToEdit;
  
  // Loading state for when we're waiting for notes to load in edit mode
  const [isLoadingNote, setIsLoadingNote] = useState(false);

  // Check if we're in edit mode but note hasn't loaded yet
  useEffect(() => {
    if (id && !noteToEdit && notes.length === 0) {
      // Notes haven't loaded yet, keep loading state
      setIsLoadingNote(true);
    } else if (id && !noteToEdit && notes.length > 0) {
      // Notes have loaded but note not found, redirect to notes list
      navigate('/notes');
    } else {
      setIsLoadingNote(false);
    }
  }, [id, noteToEdit, notes.length, navigate]);

  const handleSave = async (data: NoteCreate) => {
    if (isEditMode && noteToEdit) {
      await updateNote(noteToEdit.id, data);
    } else {
      await createNote(data);
    }

    // Navigate back to notes list after successful save
    navigate('/notes');
  };

  const handleCancel = () => {
    navigate('/notes');
  };

  const draftKey = id ? `note-editor:edit:${id}` : 'note-editor:create';

  // Show loading state while waiting for note data in edit mode
  if (isLoadingNote) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="h-[calc(100vh-12rem)] flex flex-col">
        <NoteEditor
          mode="inline"
          initialTitle={noteToEdit?.title || ''}
          initialContent={noteToEdit?.content || ''}
          initialTags={noteToEdit?.tags || []}
          projectId={noteToEdit?.learning_project_id || undefined}
          isEditMode={isEditMode}
          draftKey={draftKey}
          onSave={handleSave}
          onCancel={handleCancel}
          className="flex-1 min-h-0"
        />
      </div>
    </div>
  );
} 
