"use client"

import type React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import { MarkdownRenderer } from "@/components/atoms/MarkdownRenderer"
import { Button } from "@/components/atoms/Button"
import { Textarea } from "@/components/atoms/Textarea"
import { Input } from "@/components/atoms/Input"
import { Label } from "@/components/atoms/Label"
import { ProjectSelector } from "@/components/atoms/ProjectSelector"
import { X, Save, Sparkles, Eye, Pencil, ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/atoms/Dialog"
import { Badge } from "@/components/atoms/Badge"
import { cn } from "@/lib/utils"
import type { NoteCreate } from "@/services/api/types/notes"

interface NoteEditorProps {
  projectId?: string;
  mode?: 'popup' | 'inline'; // popup for Pomodoro, inline for Notes page
  onSave?: (data: NoteCreate) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  disableProjectSelection?: boolean; // For popup mode where project is fixed
  isEditMode?: boolean; // Whether we're editing an existing note
  draftKey?: string; // Storage key suffix for autosaved drafts
}

interface SavedDraft {
  version: number;
  title: string;
  content: string;
  tags: string[];
  selectedProjectId: string | null;
  updatedAt: string;
}

const DRAFT_STORAGE_PREFIX = 'kv-note-draft:';
const DRAFT_STORAGE_VERSION = 1;

export function NoteEditor({ 
  projectId,
  mode = 'popup',
  onSave,
  onCancel,
  className,
  initialTitle = "",
  initialContent = "",
  initialTags = [],
  disableProjectSelection = false,
  isEditMode = false,
  draftKey,
}: NoteEditorProps) {
  const draftStorageKey = useMemo(() => {
    if (draftKey) {
      return `${DRAFT_STORAGE_PREFIX}${draftKey}`;
    }

    const modeKey = isEditMode ? 'edit' : mode;
    const projectKey = projectId ?? 'none';
    return `${DRAFT_STORAGE_PREFIX}${modeKey}:${projectKey}`;
  }, [draftKey, isEditMode, mode, projectId]);

  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [currentTag, setCurrentTag] = useState("")
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    title?: boolean;
    content?: boolean;
    project?: boolean;
  }>({})
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null)
  const dismissRestoredDraftNotice = useCallback(() => {
    setHasRestoredDraft(false)
  }, [])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftStorageKey)
    } catch (error) {
      console.warn('Failed to clear note draft:', error)
    }
    setHasRestoredDraft(false)
    setRestoredDraftAt(null)
  }, [draftStorageKey])

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(draftStorageKey)
      if (!rawDraft) {
        return
      }

      const parsedDraft = JSON.parse(rawDraft) as SavedDraft
      if (parsedDraft.version !== DRAFT_STORAGE_VERSION) {
        localStorage.removeItem(draftStorageKey)
        return
      }

      const hasDraftData = Boolean(
        parsedDraft.title?.trim() ||
        parsedDraft.content?.trim() ||
        parsedDraft.tags?.length ||
        parsedDraft.selectedProjectId
      )

      if (!hasDraftData) {
        localStorage.removeItem(draftStorageKey)
        return
      }

      setTitle(parsedDraft.title ?? "")
      setContent(parsedDraft.content ?? "")
      setTags(parsedDraft.tags ?? [])
      setSelectedProjectId(parsedDraft.selectedProjectId ?? projectId ?? null)
      setCurrentTag("")
      setHasRestoredDraft(true)
      setRestoredDraftAt(parsedDraft.updatedAt ?? null)
      setValidationErrors({})
    } catch (error) {
      console.warn('Failed to restore note draft:', error)
    }
  }, [draftStorageKey, projectId])

  useEffect(() => {
    if (disableProjectSelection) {
      setSelectedProjectId(projectId || null)
    }
  }, [disableProjectSelection, projectId])

  useEffect(() => {
    const saveTimeout = window.setTimeout(() => {
      try {
        const hasMeaningfulContent = Boolean(
          title.trim() ||
          content.trim() ||
          tags.length ||
          selectedProjectId
        )

        if (!hasMeaningfulContent) {
          localStorage.removeItem(draftStorageKey)
          return
        }

        const draft: SavedDraft = {
          version: DRAFT_STORAGE_VERSION,
          title,
          content,
          tags,
          selectedProjectId,
          updatedAt: new Date().toISOString(),
        }

        localStorage.setItem(draftStorageKey, JSON.stringify(draft))
      } catch (error) {
        console.warn('Failed to save note draft:', error)
      }
    }, 300)

    return () => {
      window.clearTimeout(saveTimeout)
    }
  }, [title, content, tags, selectedProjectId, draftStorageKey])

  const addTag = useCallback(() => {
    if (currentTag && !tags.includes(currentTag)) {
      setTags(prev => [...prev, currentTag])
      setCurrentTag("")
    }
  }, [currentTag, tags])

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter((t) => t !== tag))
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentTag) {
      e.preventDefault()
      addTag()
    }
  }, [currentTag, addTag])

  const handleSave = useCallback(async () => {
    // Check validation
    const errors = {
      title: !title.trim(),
      content: !content.trim(),
      project: !selectedProjectId,
    };

    setValidationErrors(errors);

    // If there are validation errors, don't proceed
    if (errors.title || errors.content || errors.project) {
      return;
    }
    
    try {
      setIsSaving(true);
      const noteData: NoteCreate = {
        title: title.trim(),
        content: content.trim(),
        tags,
        learning_project_id: selectedProjectId!,
      };
      
      await onSave?.(noteData);
      clearDraft()
      
      // Reset form after successful save
      setTitle("");
      setContent("");
      setSelectedProjectId(projectId || null);
      setTags([]);
      setCurrentTag("");
      setShowPreview(false);
      setValidationErrors({});
    } catch (error) {
      console.error('Failed to save note:', error);
      // Error handling could be improved with toast notifications
    } finally {
      setIsSaving(false);
    }
  }, [title, content, selectedProjectId, tags, projectId, onSave, clearDraft])

  const handleCancel = useCallback(() => {
    clearDraft()

    // Reset form
    setTitle(initialTitle);
    setContent(initialContent);
    setSelectedProjectId(projectId || null);
    setTags(initialTags);
    setCurrentTag("");
    setShowPreview(false);
    setValidationErrors({});
    onCancel?.();
  }, [initialTitle, initialContent, initialTags, projectId, onCancel, clearDraft])

  const togglePreview = useCallback(() => {
    setShowPreview(prev => !prev)
  }, [])

  // Clear validation errors when user starts typing/selecting
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (validationErrors.title) {
      setValidationErrors(prev => ({ ...prev, title: false }));
    }
  }, [validationErrors.title]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (validationErrors.content) {
      setValidationErrors(prev => ({ ...prev, content: false }));
    }
  }, [validationErrors.content]);

  const handleProjectChange = useCallback((value: string | null) => {
    setSelectedProjectId(value);
    if (validationErrors.project) {
      setValidationErrors(prev => ({ ...prev, project: false }));
    }
  }, [validationErrors.project]);

  const isInlineMode = mode === 'inline';

  return (
    <div className={cn(
      "flex flex-col bg-background h-full",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          {isInlineMode && onCancel && (
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h3 className="font-medium">
            {isInlineMode ? (isEditMode ? "Edit Note" : "Create New Note") : "Quick Notes"}
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={togglePreview}>
          {showPreview ? <Pencil className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showPreview ? "Edit" : "Preview"}
        </Button>
      </div>

      {hasRestoredDraft && (
        <div className="px-3 py-2 border-b bg-accent-primary-subtle/50 text-xs flex items-center justify-between gap-3">
          <p className="text-text-secondary">
            Restored unsaved draft{restoredDraftAt ? ` from ${new Date(restoredDraftAt).toLocaleString()}` : ''}.
          </p>
          <Button size="sm" variant="ghost" onClick={dismissRestoredDraftNotice} type="button" className="h-7 px-2 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Form Fields */}
      <div className="p-3 border-b flex-shrink-0 space-y-3">
        {/* Title Input */}
        <div className="space-y-1">
          <Label htmlFor="note-title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="note-title"
            placeholder="Enter note title..."
            value={title}
            onChange={handleTitleChange}
            className={cn(
              "h-9",
              validationErrors.title && "border-destructive focus:border-destructive"
            )}
          />
        </div>

        {/* Project Selection */}
        <div className="space-y-1">
          <Label htmlFor="note-project" className="text-sm font-medium">
            Project <span className="text-destructive">*</span>
          </Label>
          <ProjectSelector
            value={selectedProjectId}
            onValueChange={handleProjectChange}
            placeholder="Select a project..."
            required={validationErrors.project}
            className="h-9"
            disabled={disableProjectSelection}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-3 overflow-y-auto min-h-0">
        {showPreview ? (
          <div className="prose dark:prose-invert max-w-none h-full w-full">
            {title && (
              <h1 className="text-2xl font-bold mb-4 pb-2 border-b">{title}</h1>
            )}
            <MarkdownRenderer 
              content={content}
              variant="preview"
              className="min-h-[200px]"
            />
          </div>
        ) : (
          <div className="space-y-2 h-full flex flex-col">
            <Label htmlFor="note-content" className="text-sm font-medium">
              Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="note-content"
              placeholder="Take notes here... Use Markdown for formatting."
              className={cn(
                "resize-none border-muted bg-background/50 font-mono text-sm flex-1 min-h-0",
                validationErrors.content && "border-destructive focus:border-destructive"
              )}
              value={content}
              onChange={handleContentChange}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t flex-shrink-0">
        {/* Tags Display */}
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button 
                onClick={() => removeTag(tag)} 
                className="ml-1 text-muted-foreground hover:text-foreground"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        
        {/* Tag Input */}
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add tags... (optional)"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
          />
          <Button variant="outline" size="sm" onClick={addTag} type="button">
            Add
          </Button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between">
          <Dialog open={showAiSuggestions} onOpenChange={setShowAiSuggestions}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Sparkles className="mr-2 h-3 w-3" />
                Refine Notes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI Note Refinement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="rounded-md bg-muted p-4">
                  <h4 className="font-medium mb-2">Suggested Flashcards</h4>
                  <div className="space-y-3">
                    <div className="rounded border p-3 bg-card">
                      <p className="font-medium">What is JWT authentication?</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        JSON Web Tokens are an open standard for securely transmitting information between parties as a
                        JSON object.
                      </p>
                    </div>
                    <div className="rounded border p-3 bg-card">
                      <p className="font-medium">What are the three parts of a JWT?</p>
                      <p className="text-sm text-muted-foreground mt-2">Header, Payload, and Signature.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-md bg-muted p-4">
                  <h4 className="font-medium mb-2">Note Structure Suggestions</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Add a summary section at the top</li>
                    <li>• Break down the authentication flow into steps</li>
                    <li>• Include code examples for token validation</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <div className="flex gap-2">
            {isInlineMode && onCancel && (
              <Button variant="outline" size="sm" onClick={handleCancel} type="button">
                Cancel
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving}
              type="button"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 
