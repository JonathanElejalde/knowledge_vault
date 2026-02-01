import { Button } from "@/components/atoms/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/DropdownMenu";
import { useNavigate } from "react-router-dom";
import { Play, FileText, FolderPlus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * QuickActions - Deep Focus Design
 * 
 * Action buttons with:
 * - Primary: "Start Pomodoro" (accent blue)
 * - Secondary: Button group (New Note, Add Project) in unified container
 * - Mobile: Primary button + dropdown for secondary
 */
export default function QuickActions() {
  const navigate = useNavigate();

  const handleStartPomodoro = () => {
    navigate("/pomodoro");
  };

  const handleNewNote = () => {
    navigate("/notes/new");
  };

  const handleAddProject = () => {
    navigate("/projects?action=new");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Primary Action - Deep Focus Blue */}
      <Button 
        onClick={handleStartPomodoro}
        className={cn(
          "gap-2 whitespace-nowrap",
          "bg-accent-primary hover:bg-accent-primary-hover text-text-inverse",
          "shadow-sm transition-all",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary"
        )}
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        Start Pomodoro
      </Button>
      
      {/* Desktop: Unified button group */}
      <div className={cn(
        "hidden sm:flex rounded-[var(--radius-md)] shadow-sm",
        "bg-surface-base border border-border-subtle",
        "divide-x divide-border-subtle overflow-hidden"
      )}>
        <button 
          onClick={handleNewNote}
          className={cn(
            "px-4 py-2 text-sm font-medium",
            "text-text-secondary hover:text-accent-primary",
            "hover:bg-accent-primary-subtle",
            "flex items-center gap-2 group transition-colors"
          )}
        >
          <FileText className="h-4 w-4 text-text-muted group-hover:text-accent-primary transition-colors" />
          New Note
        </button>
        <button 
          onClick={handleAddProject}
          className={cn(
            "px-4 py-2 text-sm font-medium",
            "text-text-secondary hover:text-accent-primary",
            "hover:bg-accent-primary-subtle",
            "flex items-center gap-2 group transition-colors"
          )}
        >
          <FolderPlus className="h-4 w-4 text-text-muted group-hover:text-accent-primary transition-colors" />
          Add Project
        </button>
      </div>

      {/* Mobile: Dropdown for secondary actions */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleNewNote}>
              <FileText className="h-4 w-4 mr-2" />
              New Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddProject}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Add Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
