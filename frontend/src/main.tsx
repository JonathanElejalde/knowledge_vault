import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DesignSystemProvider } from '@/components/providers/design-system-provider'
import { initializeAuth } from '@/features/auth/hooks/useAuth'

// Initialize auth state on app start
initializeAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignSystemProvider defaultPreset="calm" defaultColorMode="system">
      <App />
    </DesignSystemProvider>
  </StrictMode>,
)
