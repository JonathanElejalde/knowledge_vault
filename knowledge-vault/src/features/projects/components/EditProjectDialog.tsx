import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/atoms/Dialog"
import { Button } from "@/components/atoms/Button"
import { Input } from "@/components/atoms/Input"
import { Label } from "@/components/atoms/Label"
import { Textarea } from "@/components/atoms/Textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/Select"
import { PlusCircle, X } from "lucide-react"
import type { LearningProject } from "@/services/api/types/learningProjects"
import { learningProjectsApi } from "@/services/api/learningProjects"
import { categoriesApi } from "@/services/api/categories"

export interface ProjectFormData {
  name: string
  category_name: string | null
  description?: string
}

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => void
  project: LearningProject
}

export function EditProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  project,
}: EditProjectDialogProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: project.name,
    category_name: project.category_name || null,
    description: project.description || "",
  })
  const [categories, setCategories] = useState<string[]>([])
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState("")

  useEffect(() => {
    if (open) {
      // Initialize form data based on the current project when the dialog opens
      setFormData({
        name: project.name,
        category_name: null,
        description: project.description || "",
      })
      setIsCustomCategory(false)
      setCustomCategory("")

      const loadCategoriesAndSetDisplayLogic = async () => {
        let fetchedCategoryNames: string[] = []
        try {
          const categoriesData = await categoriesApi.list()
          fetchedCategoryNames = categoriesData.map(c => c.name)
        } catch (error) {
          console.error('Failed to load categories:', error)
          // Fallback to extracting from existing projects if categories API fails
          try {
            const projectsResponse = await learningProjectsApi.list()
            fetchedCategoryNames = Array.from(new Set(projectsResponse.map(p => p.category_name).filter(Boolean))) as string[]
          } catch (fallbackError) {
            console.error('Failed to load categories from projects (fallback):', fallbackError)
            // Ensure fetchedCategoryNames is an empty array if all fails
            fetchedCategoryNames = []
          }
        }

        // Filter out any empty or whitespace-only category names
        fetchedCategoryNames = fetchedCategoryNames.filter(name => name && name.trim() !== "")

        setCategories(fetchedCategoryNames)
        const currentProjectCategory = project.category_name || null

        if (fetchedCategoryNames.length === 0) {
          // No categories globally: default to custom input.
          setIsCustomCategory(true)
          setCustomCategory(project.category_name || "")
          // formData.category_name remains null
        } else {
          // Categories exist globally: default to dropdown.
          setIsCustomCategory(false) // Ensure dropdown is shown
          if (currentProjectCategory && fetchedCategoryNames.includes(currentProjectCategory)) {
            // Project's category exists in the fetched list, pre-select it.
            setFormData(prev => ({ ...prev, category_name: currentProjectCategory }))
            setCustomCategory("") // Clear any lingering custom category text
          } else {
            // Project's category is not in the list (e.g., it's new/custom) or project has no category.
            // Dropdown will be shown, formData.category_name remains null.
            // Pre-fill the customCategory state so if user clicks "+", project's current category name is there.
            setCustomCategory(project.category_name || "")
          }
        }
      }

      loadCategoriesAndSetDisplayLogic()
    }
    // Not strictly necessary to clear on close if re-init on open is robust,
    // but can be added if desired for cleanup.
    // else {
    //   setIsCustomCategory(false)
    //   setCustomCategory("")
    //   setCategories([])
    // }
  }, [open, project])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let finalCategoryValue: string | null

    if (isCustomCategory) {
      const trimmedCustomCategory = customCategory.trim()
      finalCategoryValue = trimmedCustomCategory === "" ? null : trimmedCustomCategory
    } else {
      // formData.category_name is already string | null
      if (typeof formData.category_name === 'string') {
        const trimmedSelectedCategory = formData.category_name.trim()
        finalCategoryValue = trimmedSelectedCategory === "" ? null : trimmedSelectedCategory
      } else {
        finalCategoryValue = null // It was already null
      }
    }

    const finalName = formData.name.trim()
    const finalDescription = typeof formData.description === 'string' ? formData.description.trim() : undefined

    onSubmit({
      name: finalName,
      description: finalDescription,
      category_name: finalCategoryValue,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Make changes to your project here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
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
            <Label>Category</Label>
            {isCustomCategory ? (
              <div className="flex gap-2">
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCustomCategory(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.category_name === null ? "" : formData.category_name}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setIsCustomCategory(true)
                      setFormData(prev => ({ ...prev, category_name: null }))
                    } else {
                      setFormData({ ...formData, category_name: value === "" ? null : value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Add Custom Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCustomCategory(true)}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 