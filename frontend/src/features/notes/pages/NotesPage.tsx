import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/Card';
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
    <div className="container mx-auto p-[var(--layout-page-padding)] max-w-6xl space-y-[var(--space-6)]">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-heading-2 text-text-primary">Notes</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Your learning insights and summaries
          </p>
        </div>
        <Button onClick={() => navigate('/notes/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-[var(--space-3)] animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex">
          <div className="relative flex-1">
            <Search className="absolute left-[var(--space-2-5)] top-[var(--space-2-5)] h-4 w-4 text-text-tertiary" />
            <Input
              type="text"
              placeholder={isSemanticSearch ? "Describe what you're looking for..." : "Search notes..."}
              className={`pl-[var(--space-8)] ${isSemanticSearch ? 'pr-12' : ''}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSemanticSearch && (
              <Button
                type="submit"
                size="icon-sm"
                className="absolute right-1 top-1"
                disabled={!searchQuery.trim()}
                title="Search with AI"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </form>
        
        {/* Search Mode Toggle */}
        <div className="flex items-center gap-[var(--space-1)] p-[var(--space-1)] bg-surface-sunken rounded-[var(--radius-lg)]">
          <Button
            type="button"
            variant={!isSemanticSearch ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsSemanticSearch(false)}
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
            title="AI-powered semantic search"
          >
            <Brain className="h-3.5 w-3.5 mr-1.5" />
            Semantic
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6)]">
        {/* Sidebar - Projects Filter */}
        <div className="md:col-span-1 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Card mood="growth" className="sticky top-[var(--space-4)]">
            <CardHeader className="pb-[var(--space-2)]">
              <CardTitle className="text-label">Filter by Project</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectsSidebar
                selectedProjectId={selectedProjectId}
                onProjectSelect={setSelectedProjectId}
              />
            </CardContent>
          </Card>
        </div>

        {/* Notes List */}
        <div className="md:col-span-2 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          {/* Search mode indicator */}
          {isSemanticSearch && searchQuery && !notes.length && !isLoading && (
            <Card mood="insight" className="mb-[var(--space-4)]">
              <CardContent className="py-[var(--space-3)]">
                <div className="flex items-center gap-[var(--space-2)] text-body-sm text-mood-insight-accent">
                  <Brain className="h-4 w-4" />
                  <span>Click the send button to search with AI for: <span className="font-medium">"{searchQuery}"</span></span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {searchQuery && ((isSemanticSearch && notes.length > 0) || (!isSemanticSearch)) && (
            <Card mood="content" className="mb-[var(--space-4)]">
              <CardContent className="py-[var(--space-3)]">
                <div className="flex items-center gap-[var(--space-2)] text-body-sm text-text-secondary">
                  {isSemanticSearch ? (
                    <>
                      <Brain className="h-4 w-4 text-mood-insight-accent" />
                      <span>AI search results for: <span className="font-medium text-text-primary">"{searchQuery}"</span></span>
                    </>
                  ) : (
                    <>
                      <Type className="h-4 w-4" />
                      <span>Keyword search results for: <span className="font-medium text-text-primary">"{searchQuery}"</span></span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
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
