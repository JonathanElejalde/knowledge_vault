import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  FilePlus,
  FileText,
  FolderOpen,
  MoreVertical,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/Card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/atoms/DropdownMenu';
import { ToastDescription, ToastTitle, useToast } from '@/components/atoms/Toast';
import { NotesList } from '@/features/notes/components/NotesList';
import { useNotesData } from '@/features/notes/hooks/internal';
import { EditProjectDialog } from '@/features/projects/components/EditProjectDialog';
import { learningProjectsApi } from '@/services/api/learningProjects';
import { formatUTCToLocalDate } from '@/lib/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { LearningProject } from '@/services/api/types/learningProjects';
import type { Note } from '@/services/api/types/notes';
import type { ProjectFormData } from '@/features/projects/types';

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

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [project, setProject] = useState<LearningProject | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const notesFilters = useMemo(
    () => (id ? { learning_project_id: id } : undefined),
    [id]
  );

  const {
    notes,
    isLoading: isNotesLoading,
    isLoadingMore,
    hasMore,
    error: notesError,
    loadMore,
  } = useNotesData(notesFilters);

  const fetchProject = useCallback(async () => {
    if (!id) {
      setProjectError('Invalid project URL');
      setIsProjectLoading(false);
      return;
    }

    try {
      setIsProjectLoading(true);
      setProjectError(null);
      const fetchedProject = await learningProjectsApi.get(id);
      setProject(fetchedProject);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      setProjectError('Failed to load project');
      setProject(null);
    } finally {
      setIsProjectLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/projects');
  }, [navigate]);

  const handleCreateNote = useCallback(() => {
    if (!id) {
      return;
    }

    const params = new URLSearchParams({
      projectId: id,
      returnTo: `${location.pathname}${location.search}`,
    });

    navigate(`/notes/new?${params.toString()}`, {
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
        },
      },
    });
  }, [id, location.pathname, location.search, navigate]);

  const handleEditProject = useCallback(
    async (data: ProjectFormData) => {
      if (!project) {
        return;
      }

      try {
        const updatedProject = await learningProjectsApi.update(project.id, {
          name: data.name,
          category_name: data.category_name || undefined,
          description: data.description,
        });
        setProject(updatedProject);
        setIsEditProjectOpen(false);
        toast({
          children: (
            <>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Project updated successfully</ToastDescription>
            </>
          ),
        });
      } catch {
        toast({
          variant: 'destructive',
          children: (
            <>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to update project. Please try again.</ToastDescription>
            </>
          ),
        });
      }
    },
    [project, toast]
  );

  const handleStatusChange = useCallback(
    async (newStatus: LearningProject['status']) => {
      if (!project || project.status === newStatus) {
        return;
      }

      try {
        setIsUpdatingStatus(true);
        const updatedProject = await learningProjectsApi.update(project.id, {
          status: newStatus,
        });
        setProject(updatedProject);
        toast({
          children: (
            <>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Project status updated successfully</ToastDescription>
            </>
          ),
        });
      } catch {
        toast({
          variant: 'destructive',
          children: (
            <>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Failed to update project status</ToastDescription>
            </>
          ),
        });
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [project, toast]
  );

  const handleOpenNote = useCallback(
    (note: Note) => {
      navigate(`/notes/${note.id}`, {
        state: {
          from: location,
        },
      });
    },
    [location, navigate]
  );

  if (isProjectLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8">
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-sm text-text-tertiary">Loading project...</p>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8">
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <p className="text-semantic-danger mb-2">{projectError || 'Project not found'}</p>
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.in_progress;
  const statusAction =
    project.status === 'in_progress'
      ? [
          {
            label: 'Mark as Completed',
            status: 'completed' as const,
            icon: CheckCircle,
          },
          {
            label: 'Mark as Abandoned',
            status: 'abandoned' as const,
            icon: XCircle,
          },
        ]
      : [
          {
            label: project.status === 'completed' ? 'Reopen Project' : 'Resume Project',
            status: 'in_progress' as const,
            icon: CheckCircle,
          },
        ];

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditProjectOpen(true)} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Project
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isUpdatingStatus} aria-label="Project actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {statusAction.map((action) => (
                <DropdownMenuItem
                  key={action.status}
                  onClick={() => handleStatusChange(action.status)}
                  disabled={isUpdatingStatus}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {project.category_name && (
              <Badge variant="outline" className="text-accent-primary border-accent-primary/40">
                {project.category_name}
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', status.dotClass)} />
              <span className={status.textClass}>{status.label}</span>
            </Badge>
          </div>

          <div>
            <CardTitle className="text-2xl lg:text-3xl">{project.name}</CardTitle>
            {project.description && (
              <p className="mt-3 text-sm text-text-secondary max-w-3xl">{project.description}</p>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-4">
              <div className="flex items-center gap-2 text-text-tertiary mb-2">
                <FileText className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Notes</span>
              </div>
              <p className="text-2xl font-semibold text-text-primary">{project.notes_count}</p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-4">
              <div className="flex items-center gap-2 text-text-tertiary mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Sessions</span>
              </div>
              <p className="text-2xl font-semibold text-text-primary">{project.sessions_count}</p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-4">
              <div className="flex items-center gap-2 text-text-tertiary mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Created</span>
              </div>
              <p className="text-sm font-medium text-text-primary">
                {project.created_at ? formatUTCToLocalDate(project.created_at) : 'Unknown'}
              </p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-4">
              <div className="flex items-center gap-2 text-text-tertiary mb-2">
                <FolderOpen className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Updated</span>
              </div>
              <p className="text-sm font-medium text-text-primary">
                {project.updated_at ? formatUTCToLocalDate(project.updated_at) : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-text-primary">Project Notes</h3>
            <p className="text-sm text-text-tertiary">
              All notes linked to this project.
            </p>
          </div>
          <Button variant="outline" onClick={handleCreateNote} className="gap-2">
            <FilePlus className="h-4 w-4" />
            Add Note
          </Button>
        </div>

        <NotesList
          notes={notes}
          isLoading={isNotesLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          error={notesError}
          onLoadMore={loadMore}
          onNoteClick={handleOpenNote}
          onCreateNew={handleCreateNote}
        />
      </section>

      <EditProjectDialog
        open={isEditProjectOpen}
        onOpenChange={setIsEditProjectOpen}
        onSubmit={handleEditProject}
        project={project}
      />
    </div>
  );
}
