import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NoteEditor } from '@/components/atoms/NoteEditor';
import { useNotes } from '../hooks/internal';
import type { NoteCreate } from '@/services/api/types/notes';

export default function CreateNotePage() {
  const navigate = useNavigate();
  const { createNote } = useNotes();

  const handleSave = async (data: NoteCreate) => {
    try {
      await createNote(data);
      // Navigate back to notes list after successful creation
      navigate('/notes');
    } catch (error) {
      // Error is already logged in the component
      // Could add toast notification here
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/notes');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="h-[calc(100vh-12rem)] flex flex-col">
        <NoteEditor
          mode="inline"
          onSave={handleSave}
          onCancel={handleCancel}
          className="flex-1 min-h-0"
        />
      </div>
    </div>
  );
} 