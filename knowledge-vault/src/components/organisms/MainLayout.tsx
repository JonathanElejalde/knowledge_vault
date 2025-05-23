import Header from "./Header";
import Sidebar from "./Sidebar";
import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background">
          <div className="max-w-7xl mx-auto px-1 mt-6 space-y-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 