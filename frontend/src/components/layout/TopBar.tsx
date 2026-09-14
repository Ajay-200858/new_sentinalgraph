import React from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, Search, Bell, CheckCircle2, Menu, X } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';

interface TopBarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ isSidebarOpen, onToggleSidebar }) => {
  const location = useLocation();
  const isPollingActive = useDashboardStore((state) => state.isPollingActive);

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return ['Dashboard', 'Overview'];

    const breadcrumbMap: Record<string, string> = {
      dashboard: 'Dashboard',
      overview: 'Overview',
      graph: 'Network Graph',
      forecast: 'Forecast',
      events: 'Events',
      simulation: 'Simulation',
      replay: 'Replay Control',
      settings: 'Settings',
      analysis: 'Analysis',
      mitre: 'MITRE ATT&CK',
      'host-details': 'Host Details',
      'system-status': 'System Status',
      'caspian-config': 'Caspian Config',
    };

    return paths.map((path) => breadcrumbMap[path] || path.charAt(0).toUpperCase() + path.slice(1));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-16 border-b border-soc-border bg-soc-card px-md md:px-lg flex items-center justify-between sticky top-0 z-40">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center space-x-md">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
          className="md:hidden p-sm text-soc-secondary hover:text-soc-primary hover:bg-soc-input rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-xs text-sm">
          <Shield className="w-4 h-4 text-soc-cyan" />
          <span className="text-soc-muted">/</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-soc-muted">/</span>}
              <span
                className={
                  idx === breadcrumbs.length - 1
                    ? 'font-semibold text-soc-primary'
                    : 'text-soc-secondary hover:text-soc-primary transition-colors'
                }
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right Controls: Search, Status Badges, Notifications */}
      <div className="flex items-center space-x-sm md:space-x-md">
        {/* Search Bar */}
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-soc-muted" />
          <input
            type="text"
            placeholder="Search IP, node, CVE..."
            className="pl-9 pr-md py-xs text-xs bg-soc-input border border-soc-border rounded-lg text-soc-primary placeholder-soc-muted focus:outline-none focus:border-soc-cyan w-48 md:w-64 transition-colors"
          />
        </div>

        {/* Real-time Streaming Status Badge */}
        <div className="hidden lg:flex items-center space-x-xs px-sm py-xs bg-soc-input border border-soc-border rounded-full text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              isPollingActive ? 'bg-soc-neon-green animate-pulse' : 'bg-soc-muted'
            }`}
          />
          <span
            className={`font-semibold uppercase tracking-wider ${
              isPollingActive ? 'text-soc-neon-green' : 'text-soc-muted'
            }`}
          >
            {isPollingActive ? 'Streaming' : 'Stopped'}
          </span>
        </div>

        {/* System Health Indicator */}
        <div className="hidden md:flex items-center space-x-xs px-sm py-xs bg-soc-input border border-soc-border rounded-full text-xs text-soc-neon-green font-mono">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Healthy</span>
        </div>

        {/* Notification Bell */}
        <button
          aria-label="View Notifications"
          className="p-sm text-soc-secondary hover:text-soc-primary hover:bg-soc-input rounded-lg transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-soc-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>
      </div>
    </header>
  );
};
