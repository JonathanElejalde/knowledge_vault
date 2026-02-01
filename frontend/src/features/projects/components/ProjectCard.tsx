import { Link } from "react-router-dom";
import { MoreVertical, Edit, CheckCircle, XCircle, Trash2, FileText, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/atoms/Card";
import { Button } from "@/components/atoms/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/atoms/DropdownMenu";
import { formatUTCToLocalDate } from "@/lib/utils/dateUtils";
import { cn } from "@/lib/utils";
import type { LearningProject } from "@/services/api/types/learningProjects";

interface ProjectCardProps {
  project: LearningProject;
  onEdit: (project: LearningProject) => void;
  onStatusChange: (projectId: string, newStatus: string) => void;
  onDelete: (projectId: string) => void;
}

// Status configuration with semantic colors
const statusConfig = {
  in_progress: {
    label: 'In Progress',
    dotClass: 'bg-accent-primary',
    textClass: 'text-accent-primary',
  },
  completed: {
    label: 'Completed',
    dotClass: 'bg-mood-growth-accent',
    textClass: 'text-mood-growth-accent',
  },
  abandoned: {
    label: 'Abandoned',
    dotClass: 'bg-text-muted',
    textClass: 'text-text-muted',
  },
} as const;

/**
 * ProjectCard - Deep Focus Design
 * 
 * Uses default mood with growth accent colors for a clean look
 * that matches the rest of the app's calm aesthetic.
 */
export function ProjectCard({ project, onEdit, onStatusChange, onDelete }: ProjectCardProps) {
  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.in_progress;
  
  return (
    <Card 
      interactive
      className="group flex flex-col h-full hover:border-accent-primary/50"
    >
      <CardHeader className="flex-1">
        {/* Top row: Category + Actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          {project.category_name ? (
            <span className="text-xs font-medium text-accent-primary uppercase tracking-wider">
              {project.category_name}
            </span>
          ) : (
            <span />
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Project actions"
              >
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
                className="text-semantic-danger focus:text-semantic-danger"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Project Name */}
        <h3 className="text-lg font-semibold text-text-primary leading-snug mb-2 line-clamp-2">
          {project.name}
        </h3>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-text-secondary line-clamp-2 mb-3">
            {project.description}
          </p>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-2 mt-auto">
          <div className={cn("h-2 w-2 rounded-full", status.dotClass)} />
          <span className={cn("text-xs font-medium", status.textClass)}>
            {status.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats Row */}
        <div className="flex items-center justify-between py-3 border-t border-border-subtle">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="text-xs">
              <span className="font-medium text-text-secondary">{project.sessions_count}</span> sessions
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="text-xs">
              <span className="font-medium text-text-secondary">{project.notes_count}</span> notes
            </span>
          </div>
        </div>

        {/* View Button */}
        <Button 
          variant="outline" 
          size="sm"
          className="w-full text-xs font-medium" 
          asChild
        >
          <Link to={`/projects/${project.id}`}>View Project</Link>
        </Button>

        {/* Created Date - subtle footer */}
        <p className="text-[11px] text-text-muted text-center mt-3">
          Created {formatUTCToLocalDate(project.created_at)}
        </p>
      </CardContent>
    </Card>
  );
} 