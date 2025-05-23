import { useState, useEffect } from "react"
import { X, Plus } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"
import { Button } from "@/components/atoms/Button"
import { Input } from "@/components/atoms/Input"
import { Label } from "@/components/atoms/Label"
import { Textarea } from "@/components/atoms/Textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/Select"
import { learningProjectsApi } from "@/services/api/learningProjects"

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => void
}

export interface ProjectFormData {
  name: string
  category: string
  description?: string
}

export function NewProjectDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
}: NewProjectDialogProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    category: "",
    description: ""
  })
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  // Load unique categories from existing projects
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true)
        const projects = await learningProjectsApi.list()
        const uniqueCategories = Array.from(new Set(projects.map(p => p.category).filter(Boolean)))
        setCategories(uniqueCategories)
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        setIsLoadingCategories(false)
      }
    }

    if (open) {
      loadCategories()
    }
  }, [open])

  // Show input field by default if there are no categories
  useEffect(() => {
    if (!categories || categories.length === 0) {
      setIsCustomCategory(true)
    } else {
      setIsCustomCategory(false)
    }
  }, [categories, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalCategory = isCustomCategory ? customCategory : formData.category
    onSubmit({ ...formData, category: finalCategory })
    setFormData({ name: "", category: "", description: "" })
    setCustomCategory("")
    setIsCustomCategory(categories.length === 0)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
          <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
            Create New Project
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Add a new learning project to track your progress.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              {(!categories || categories.length === 0 || isCustomCategory) ? (
                <div className="flex gap-2">
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    required
                    className="flex-1"
                  />
                  {categories && categories.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCustomCategory(false)
                        setCustomCategory("")
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ) :
                <div className="flex gap-2">
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setIsCustomCategory(true)
                      } else {
                        setFormData({ ...formData, category: value })
                      }
                    }}
                    required
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select a category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Add Custom Category as the first item */}
                      <SelectItem 
                        value="custom" 
                        className="bg-muted hover:bg-accent text-primary font-medium cursor-pointer border-b border-border"
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add Custom Category
                        </span>
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter project description"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Project</Button>
            </div>
          </form>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
} 