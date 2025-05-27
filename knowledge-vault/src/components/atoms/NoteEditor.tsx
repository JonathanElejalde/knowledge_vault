"use client"

import type React from "react"
import { useState, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism"
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
}

export function NoteEditor({ 
  projectId,
  mode = 'popup',
  onSave,
  onCancel,
  className,
  initialTitle = "",
  initialContent = "",
  initialTags = [],
  disableProjectSelection = false
}: NoteEditorProps) {
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
  }, [title, content, selectedProjectId, tags, projectId, onSave])

  const handleCancel = useCallback(() => {
    // Reset form
    setTitle(initialTitle);
    setContent(initialContent);
    setSelectedProjectId(projectId || null);
    setTags(initialTags);
    setCurrentTag("");
    setShowPreview(false);
    setValidationErrors({});
    onCancel?.();
  }, [initialTitle, initialContent, initialTags, projectId, onCancel])

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
            {isInlineMode ? "Create New Note" : "Quick Notes"}
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={togglePreview}>
          {showPreview ? <Pencil className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showPreview ? "Edit" : "Preview"}
        </Button>
      </div>

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
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-3xl font-bold my-4 border-b pb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-2xl font-semibold my-3 border-b pb-1" {...props} />,
                p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                pre: ({node, children, ...props }) => (
                  <pre 
                    className="rounded-md overflow-x-auto my-4 text-sm"
                    {...props} 
                  >
                    {children}
                  </pre>
                ),
                code: ({node, className, children, ...props}) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!match && !className?.includes('language-')) {
                    return <code className="bg-muted text-primary px-1.5 py-1 rounded-md text-sm font-mono" {...props}>{children}</code>;
                  }
                  
                  return match ? (
                    <SyntaxHighlighter
                      style={okaidia as any}
                      language={match[1]}
                      PreTag="div"
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={`block w-full ${className || ''} font-mono bg-gray-800 p-2 rounded`} {...props}>
                      {codeString}
                    </code>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
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