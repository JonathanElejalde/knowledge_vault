import Header from "./Header";
import Sidebar from "./Sidebar";
import { GlobalTimer } from "./GlobalTimer";
import type { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * MainLayout - Deep Focus Design
 * 
 * Layout structure:
 * - Sidebar (left): Collapsible (icons on tablet, full on desktop)
 * - Main content (right): Header + GlobalTimer + scrollable content
 * 
 * Uses surface-ground as the main background for a calm, unified look.
 */
export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-ground text-text-primary font-sans antialiased">
      {/* Sidebar - hidden on mobile, icon-only on tablet, full on desktop */}
      <Sidebar />
      
      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Pomodoro timer bar (when active) */}
        <GlobalTimer />
        
        {/* Header */}
        <Header />
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
