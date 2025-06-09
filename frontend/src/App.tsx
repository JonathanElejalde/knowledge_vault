import { Router } from "@/app/router";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
// import './App.css'; // Remove default App.css, styling is handled by Tailwind via index.css

export default function App() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}
