import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { PlusCircle, Search } from 'lucide-react';
import { ProjectsSidebar } from '../components/ProjectsSidebar';
import { NotesList } from '../components/NotesList';
import { useNotes } from '../hooks/internal';
import type { Note } from '@/services/api/types/notes';

export default function NotesPage() {
  const navigate = useNavigate();
  
  const {
    notes,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    searchQuery,
    selectedProjectId,
    setSearchQuery,
    setSelectedProjectId,
    loadMore,
    deleteNote,
  } = useNotes();

  const handleNoteClick = (note: Note) => {
    // TODO: Navigate to note detail/view page or open in read mode
    console.log('Note clicked:', note);
  };

  const handleNoteEdit = (note: Note) => {
    navigate(`/notes/edit/${note.id}`);
  };

  const handleNoteDelete = async (noteId: string) => {
    await deleteNote(noteId);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">Your learning insights and summaries</p>
        </div>
        <Button onClick={() => navigate('/notes/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search notes..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar - Projects Filter */}
        <div className="md:col-span-1">
          <ProjectsSidebar
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
          />
        </div>

        {/* Notes List */}
        <div className="md:col-span-2">
          <NotesList
            notes={notes}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            error={error}
            onLoadMore={loadMore}
            onNoteClick={handleNoteClick}
            onNoteEdit={handleNoteEdit}
            onNoteDelete={handleNoteDelete}
          />
        </div>
      </div>
    </div>
  );
} 