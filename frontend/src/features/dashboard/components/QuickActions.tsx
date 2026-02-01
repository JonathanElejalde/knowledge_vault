import { Button } from "@/components/atoms/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/DropdownMenu";
import { useNavigate } from "react-router-dom";
import { Play, FileText, FolderPlus, Plus } from "lucide-react";

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
    <div className="flex items-center gap-[var(--space-2)]">
      {/* Primary Action - Always visible */}
      <Button 
        onClick={handleStartPomodoro}
        variant="focus"
        className="gap-[var(--space-2)] whitespace-nowrap"
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Start Pomodoro</span>
        <span className="sm:hidden">Start</span>
      </Button>
      
      {/* Desktop: Show all buttons */}
      <div className="hidden sm:flex items-center gap-[var(--space-2)]">
        <Button 
          variant="outline" 
          onClick={handleNewNote}
          className="gap-[var(--space-2)] whitespace-nowrap"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          New Note
        </Button>
        <Button 
          variant="outline" 
          onClick={handleAddProject}
          className="gap-[var(--space-2)] whitespace-nowrap"
        >
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          Add Project
        </Button>
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
