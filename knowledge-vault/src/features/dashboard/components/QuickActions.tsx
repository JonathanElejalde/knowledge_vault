import { Button } from "@/components/atoms/Button";
import { useNavigate } from "react-router-dom";

// TODO: Define actual actions and handlers
export default function QuickActions() {
  const navigate = useNavigate();

  const handleStartPomodoro = () => {
    navigate("/pomodoro");
  };

  // TODO: Define actual actions and handlers for other buttons
  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleStartPomodoro}>Start Pomodoro</Button>
      <Button variant="outline">New Note</Button>
      <Button variant="outline">Add Project</Button>
    </div>
  );
} 