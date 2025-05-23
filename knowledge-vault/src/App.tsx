import MainLayout from "@/components/organisms/MainLayout";
import AppRouter from "@/app/Router";
// import './App.css'; // Remove default App.css, styling is handled by Tailwind via index.css

function App() {
  return (
    <MainLayout>
      <AppRouter />
    </MainLayout>
  );
}

export default App;
