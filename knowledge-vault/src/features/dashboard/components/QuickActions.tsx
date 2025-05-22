import { Button } from "@/components/atoms/Button";

// TODO: Define actual actions and handlers
export default function QuickActions() {
  return (
    <div className="flex items-center gap-2">
      <Button>Start Pomodoro</Button>
      <Button variant="outline">New Note</Button>
      <Button variant="outline">Add Project</Button>
    </div>
  );
} 