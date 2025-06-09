import { Link } from "react-router-dom";
import { MoreVertical, Edit, CheckCircle, XCircle, Trash2, Calendar, FileText, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Button } from "@/components/atoms/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/atoms/DropdownMenu";
import { formatUTCToLocalDate } from "@/lib/utils/dateUtils";
import type { LearningProject } from "@/services/api/types/learningProjects";

interface ProjectCardProps {
  project: LearningProject;
  onEdit: (project: LearningProject) => void;
  onStatusChange: (projectId: string, newStatus: string) => void;
  onDelete: (projectId: string) => void;
}

// Function to format status for display
const formatStatus = (status: string): string => {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'abandoned':
      return 'Abandoned';
    default:
      return status;
  }
};

export function ProjectCard({ project, onEdit, onStatusChange, onDelete }: ProjectCardProps) {
  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        <CardHeader className="p-0 pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              {project.category_name && (
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {project.category_name}
                </div>
              )}
              <CardTitle className="text-2xl font-bold leading-tight mb-1">
                {project.name}
              </CardTitle>
              {project.description && (
                <CardDescription className="line-clamp-2 text-base text-muted-foreground mb-2">
                  {project.description}
                </CardDescription>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Created {formatUTCToLocalDate(project.created_at)}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Project actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </DropdownMenuItem>
                {project.status === 'in_progress' && (
                  <>
                    <DropdownMenuItem onClick={() => onStatusChange(project.id, 'completed')}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange(project.id, 'abandoned')}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Mark as Abandoned
                    </DropdownMenuItem>
                  </>
                )}
                {project.status === 'abandoned' && (
                  <DropdownMenuItem onClick={() => onStatusChange(project.id, 'in_progress')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Resume Project
                  </DropdownMenuItem>
                )}
                {project.status === 'completed' && (
                  <DropdownMenuItem onClick={() => onStatusChange(project.id, 'in_progress')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Reopen Project
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => onDelete(project.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col justify-end">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-base mb-2">
              <div className={`h-2 w-2 rounded-full mt-0.5 ${
                project.status === 'in_progress' ? 'bg-blue-500' :
                project.status === 'completed' ? 'bg-green-500' :
                'bg-red-500'
              }`} />
              <span>{formatStatus(project.status)}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{project.sessions_count}</span>
                <span className="text-muted-foreground">sessions</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{project.notes_count}</span>
                <span className="text-muted-foreground">notes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
      <CardFooter className="p-0 pt-4">
        <Button 
          variant="outline" 
          className="w-full font-bold text-base py-2 border-2 border-gray-200" 
          asChild
        >
          <Link to={`/projects/${project.id}`}>View Project</Link>
        </Button>
      </CardFooter>
    </Card>
  );
} 