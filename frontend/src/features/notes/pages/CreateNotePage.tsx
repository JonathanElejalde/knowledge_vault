import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { NoteEditor } from '@/components/atoms/NoteEditor';
import { useNotes } from '../hooks/internal';
import { notesApi } from '@/services/api/notes';
import type { Note } from '@/services/api/types/notes';
import type { NoteCreate } from '@/services/api/types/notes';

export default function EditCreateNotePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { createNote, updateNote } = useNotes();
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(Boolean(id));
  
  const returnSearch = location.state?.from?.search;
  const safeReturnSearch =
    typeof returnSearch === 'string' && returnSearch.startsWith('?')
      ? returnSearch
      : '';

  const navigateToNotesList = useCallback(() => {
    navigate(`/notes${safeReturnSearch}`);
  }, [navigate, safeReturnSearch]);

  const isEditMode = Boolean(id);

  useEffect(() => {
    if (!id) {
      setNoteToEdit(null);
      setIsLoadingNote(false);
      return;
    }

    let isMounted = true;

    const fetchNoteForEdit = async () => {
      setIsLoadingNote(true);
      try {
        const fetchedNote = await notesApi.get(id);
        if (!isMounted) {
          return;
        }
        setNoteToEdit(fetchedNote);
      } catch (error) {
        console.error('Failed to load note for editing:', error);
        if (isMounted) {
          navigateToNotesList();
        }
      } finally {
        if (isMounted) {
          setIsLoadingNote(false);
        }
      }
    };

    fetchNoteForEdit();

    return () => {
      isMounted = false;
    };
  }, [id, navigateToNotesList]);

  const handleSave = async (data: NoteCreate) => {
    if (id) {
      await updateNote(id, data);
    } else {
      await createNote(data);
    }

    navigateToNotesList();
  };

  const handleCancel = () => {
    navigateToNotesList();
  };

  const draftKey = id ? `note-editor:edit:${id}` : 'note-editor:create';
  const queryProjectId = searchParams.get('projectId') || undefined;
  const initialProjectId = isEditMode
    ? noteToEdit?.learning_project_id || undefined
    : queryProjectId;

  if (isEditMode && isLoadingNote) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading note...</p>
        </div>
      </div>
    );
  }

  if (isEditMode && !noteToEdit) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="h-[calc(100vh-12rem)] flex flex-col">
        <NoteEditor
          mode="inline"
          initialTitle={noteToEdit?.title || ''}
          initialContent={noteToEdit?.content || ''}
          initialTags={noteToEdit?.tags || []}
          projectId={initialProjectId}
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
