import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { useAuth } from '@/features/auth/hooks/useAuth'

// Initialize auth state
function AuthInitializer() {
  const { initializeAuth } = useAuth();
  
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthInitializer />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
