import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { PlusCircle, Search, Brain, Type, Send } from 'lucide-react';
import { ProjectsSidebar } from '../components/ProjectsSidebar';
import { NotesList } from '../components/NotesList';
import { useNotes } from '../hooks/internal';
import type { Note } from '@/services/api/types/notes';

export default function NotesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    notes,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    searchQuery,
    selectedProjectId,
    isSemanticSearch,
    setSearchQuery,
    setSelectedProjectId,
    setIsSemanticSearch,
    triggerSemanticSearch,
    loadMore,
    deleteNote,
  } = useNotes();

  const handleNoteClick = (note: Note) => {
    // Navigate to note view page, passing current location for back navigation
    navigate(`/notes/${note.id}`, {
      state: { from: location }
    });
  };

  const handleNoteEdit = (note: Note) => {
    navigate(`/notes/edit/${note.id}`);
  };

  const handleNoteDelete = async (noteId: string) => {
    await deleteNote(noteId);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If semantic search is active, trigger the search manually
    if (isSemanticSearch) {
      triggerSemanticSearch();
    }
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
      <div className="flex items-center gap-3 mb-6">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={isSemanticSearch ? "Describe what you're looking for..." : "Search notes..."}
              className={`pl-8 ${isSemanticSearch ? 'pr-12' : ''}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSemanticSearch && (
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                disabled={!searchQuery.trim()}
                title="Search with AI"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </form>
        
        {/* Search Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <Button
            type="button"
            variant={!isSemanticSearch ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsSemanticSearch(false)}
            className="h-8 px-3"
            title="Keyword search"
          >
            <Type className="h-3.5 w-3.5 mr-1.5" />
            Keyword
          </Button>
          <Button
            type="button"
            variant={isSemanticSearch ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsSemanticSearch(true)}
            className="h-8 px-3"
            title="AI-powered semantic search"
          >
            <Brain className="h-3.5 w-3.5 mr-1.5" />
            Semantic
          </Button>
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
          {/* Search mode indicator */}
          {isSemanticSearch && searchQuery && !notes.length && !isLoading && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Brain className="h-4 w-4" />
                <span>Click the send button to search with AI for: <span className="font-medium">"{searchQuery}"</span></span>
              </div>
            </div>
          )}
          
          {searchQuery && ((isSemanticSearch && notes.length > 0) || (!isSemanticSearch)) && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isSemanticSearch ? (
                  <>
                    <Brain className="h-4 w-4" />
                    <span>AI search results for: <span className="font-medium text-foreground">"{searchQuery}"</span></span>
                  </>
                ) : (
                  <>
                    <Type className="h-4 w-4" />
                    <span>Keyword search results for: <span className="font-medium text-foreground">"{searchQuery}"</span></span>
                  </>
                )}
              </div>
            </div>
          )}
          
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