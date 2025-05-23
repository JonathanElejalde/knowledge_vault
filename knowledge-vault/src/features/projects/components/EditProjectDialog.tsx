import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/atoms/Dialog"
import { Button } from "@/components/atoms/Button"
import { Input } from "@/components/atoms/Input"
import { Label } from "@/components/atoms/Label"
import { Textarea } from "@/components/atoms/Textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/Select"
import { PlusCircle, X } from "lucide-react"
import type { LearningProject } from "@/services/api/types/learningProjects"

export interface ProjectFormData {
  name: string
  category: string
  description?: string
}

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => void
  project: LearningProject
  existingCategories: string[]
}

export function EditProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  project,
  existingCategories,
}: EditProjectDialogProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: project.name,
    category: project.category,
    description: project.description || "",
  })
  const [isCustomCategory, setIsCustomCategory] = useState(!existingCategories.includes(project.category))
  const [customCategory, setCustomCategory] = useState(
    !existingCategories.includes(project.category) ? project.category : ""
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      category: isCustomCategory ? customCategory : formData.category,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
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
                  required
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
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Add Custom Category</SelectItem>
                    {existingCategories.map((category) => (
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