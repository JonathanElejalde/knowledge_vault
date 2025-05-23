"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/atoms/Button"
import { Textarea } from "@/components/atoms/Textarea"
import { Input } from "@/components/atoms/Input"
import { X, Save, Sparkles, Maximize2, Minimize2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/atoms/Dialog"
import { Badge } from "@/components/atoms/Badge"

interface NotesEditorProps {
  projectId?: string
}

export default function NotesEditor({ projectId }: NotesEditorProps) {
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")
  const [isDetached, setIsDetached] = useState(false)
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)

  const addTag = () => {
    if (currentTag && !tags.includes(currentTag)) {
      setTags([...tags, currentTag])
      setCurrentTag("")
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentTag) {
      e.preventDefault()
      addTag()
    }
  }

  const saveNotes = () => {
    // Save notes logic would go here
    console.log("Saving notes:", { content, tags, projectId })
  }

  const toggleAiSuggestions = () => {
    setShowAiSuggestions(!showAiSuggestions)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium">Quick Notes</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsDetached(!isDetached)}>
            {isDetached ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <Textarea
          placeholder="Take notes here... Use Markdown for formatting."
          className="min-h-[200px] resize-none border-muted bg-background/50 font-mono text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="p-3 border-t">
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => removeTag(tag)} className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add tags..."
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
          />
          <Button variant="outline" size="sm" onClick={addTag}>
            Add
          </Button>
        </div>
        <div className="flex justify-between">
          <Dialog open={showAiSuggestions} onOpenChange={setShowAiSuggestions}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
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
          <Button size="sm" onClick={saveNotes}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
    </div>
  )
} 