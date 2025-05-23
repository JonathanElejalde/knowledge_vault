import DashboardPage from "@/features/dashboard/DashboardPage";
import MainLayout from "@/components/organisms/MainLayout";
// import './App.css'; // Remove default App.css, styling is handled by Tailwind via index.css

function App() {
  return (
    <MainLayout>
      <DashboardPage />
    </MainLayout>
  );
}

export default App;
