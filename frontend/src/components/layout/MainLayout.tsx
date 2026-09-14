import React, { useState, ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useDashboardPolling } from '../../hooks/useDashboardPolling';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Activate active-page telemetry polling
  useDashboardPolling();

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebarMobile = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-soc-bg text-soc-primary flex flex-col font-sans selection:bg-soc-cyan selection:text-slate-950">
      <TopBar isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isOpen={isSidebarOpen} onCloseMobile={closeSidebarMobile} />
        <main className="flex-1 p-md md:p-lg overflow-y-auto bg-soc-bg">{children}</main>
      </div>
    </div>
  );
};
