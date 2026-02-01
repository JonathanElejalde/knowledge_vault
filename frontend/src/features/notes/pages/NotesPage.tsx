import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/Card';
import { FilePlus, Search, Brain, Type, Send } from 'lucide-react';
import { ProjectsSidebar } from '../components/ProjectsSidebar';
import { NotesList } from '../components/NotesList';
import { useNotes } from '../hooks/internal';
import { cn } from '@/lib/utils';
import type { Note } from '@/services/api/types/notes';

/**
 * NotesPage - Deep Focus Design
 * 
 * Layout structure:
 * 1. Header: Title + description (left) | New Note action (right)
 * 2. Search: Input with semantic/keyword toggle
 * 3. Main: Sidebar (project filter) + Notes list
 */
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
    if (isSemanticSearch) {
      triggerSemanticSearch();
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        {/* Title & Description */}
        <div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">
            Notes
          </h2>
          <p className="mt-2 text-text-tertiary text-sm max-w-xl">
            Capture and organize your learning insights. Search by keyword or use AI-powered semantic search.
          </p>
        </div>
        
        {/* Actions */}
        <Button 
          onClick={() => navigate('/notes/new')}
          className="gap-2"
        >
          <FilePlus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Search and Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            type="text"
            placeholder={isSemanticSearch ? "Describe what you're looking for..." : "Search notes..."}
            className={cn("pl-10", isSemanticSearch && "pr-12")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSemanticSearch && (
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              disabled={!searchQuery.trim()}
              title="Search with AI"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
        
        {/* Search Mode Toggle - Pill style */}
        <nav 
          className="inline-flex items-center gap-1 p-1 bg-surface-sunken rounded-lg"
          role="tablist"
          aria-label="Search mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isSemanticSearch}
            onClick={() => setIsSemanticSearch(false)}
            className={cn(
              "px-4 py-1.5 rounded-md",
              "text-xs font-medium whitespace-nowrap",
              "transition-colors flex items-center gap-1.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
              !isSemanticSearch 
                ? "bg-surface-base dark:bg-surface-raised text-text-primary shadow-sm ring-1 ring-border-subtle"
                : "text-text-tertiary hover:text-accent-primary"
            )}
          >
            <Type className="h-3.5 w-3.5" />
            Keyword
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSemanticSearch}
            onClick={() => setIsSemanticSearch(true)}
            className={cn(
              "px-4 py-1.5 rounded-md",
              "text-xs font-medium whitespace-nowrap",
              "transition-colors flex items-center gap-1.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
              isSemanticSearch 
                ? "bg-surface-base dark:bg-surface-raised text-text-primary shadow-sm ring-1 ring-border-subtle"
                : "text-text-tertiary hover:text-accent-primary"
            )}
          >
            <Brain className="h-3.5 w-3.5" />
            Semantic
          </button>
        </nav>
      </div>

      {/* Main Content - 3 column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Projects Filter */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Filter by Project</CardTitle>
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
        <div className="lg:col-span-3">
          {/* Search mode indicator */}
          {isSemanticSearch && searchQuery && !notes.length && !isLoading && (
            <div className={cn(
              "flex items-center gap-3 p-4 mb-6 rounded-lg",
              "bg-accent-primary-subtle/50 border border-accent-primary/20"
            )}>
              <Brain className="h-4 w-4 text-accent-primary flex-shrink-0" />
              <p className="text-sm text-text-secondary">
                Click the send button to search with AI for: <span className="font-medium text-text-primary">"{searchQuery}"</span>
              </p>
            </div>
          )}
          
          {searchQuery && ((isSemanticSearch && notes.length > 0) || (!isSemanticSearch)) && (
            <div className={cn(
              "flex items-center gap-3 p-4 mb-6 rounded-lg",
              "bg-surface-sunken border border-border-subtle"
            )}>
              {isSemanticSearch ? (
                <Brain className="h-4 w-4 text-accent-primary flex-shrink-0" />
              ) : (
                <Type className="h-4 w-4 text-text-muted flex-shrink-0" />
              )}
              <p className="text-sm text-text-secondary">
                {isSemanticSearch ? 'AI' : 'Keyword'} search results for: <span className="font-medium text-text-primary">"{searchQuery}"</span>
              </p>
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
            onCreateNew={() => navigate('/notes/new')}
          />
        </div>
      </div>
    </div>
  );
}
