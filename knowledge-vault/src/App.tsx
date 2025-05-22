import DashboardPage from "@/features/dashboard/DashboardPage";
// import './App.css'; // Remove default App.css, styling is handled by Tailwind via index.css

function App() {
  return (
    <>
      {/* Future: MainLayout component could wrap this */}
      <DashboardPage />
      {/* Future: Router will go here instead of directly rendering DashboardPage */}
    </>
  );
}

export default App;
