import { Route, Routes } from "react-router-dom";
import DashboardPage from "@/features/dashboard/DashboardPage";
import PomodoroPage from "@/features/pomodoro/pages/PomodoroPage";
// Import other page components here as they are created
// For example:
// import NotesPage from "@/features/notes/pages/NotesPage";
// import ProjectsPage from "@/features/projects/pages/ProjectsPage";
// import SettingsPage from "@/features/settings/pages/SettingsPage";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/pomodoro" element={<PomodoroPage />} />
      {/* Define other routes here */}
      {/* <Route path="/notes" element={<NotesPage />} /> */}
      {/* <Route path="/projects" element={<ProjectsPage />} /> */}
      {/* <Route path="/settings" element={<SettingsPage />} /> */}
      {/* Add a catch-all or 404 route if desired */}
      {/* <Route path="*" element={<NotFoundPage />} /> */}
    </Routes>
  );
} 