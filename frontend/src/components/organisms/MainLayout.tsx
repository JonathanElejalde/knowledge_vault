import Header from "./Header";
import Sidebar from "./Sidebar";
import { GlobalTimer } from "./GlobalTimer";
import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-ground">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <GlobalTimer />
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-[var(--layout-gutter-sm)] md:px-[var(--layout-gutter)] mt-[var(--space-6)] space-y-[var(--space-4)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
