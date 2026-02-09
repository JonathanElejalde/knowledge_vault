import { useSearchParams } from 'react-router-dom';
import { NoteEditor } from '@/components/atoms/NoteEditor';
import { notesApi } from '@/services/api/notes';
import type { NoteCreate } from '@/services/api/types/notes';

export default function QuickNotePage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || undefined;
  const source = searchParams.get('source') || 'web';
  const draftKey = `note-editor:quick:${source}:${projectId ?? 'none'}`;

  const handleSave = async (data: NoteCreate) => {
    await notesApi.create(data);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-base">
      <NoteEditor
        mode="popup"
        projectId={projectId}
        disableProjectSelection={Boolean(projectId)}
        draftKey={draftKey}
        onSave={handleSave}
      />
    </div>
  );
}
