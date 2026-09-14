import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Network,
  TrendingUp,
  ShieldAlert,
  PlayCircle,
  Sliders,
  Grid,
  Server,
  Activity,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const sections: NavSection[] = [
    {
      title: 'DASHBOARD',
      items: [
        { label: 'Overview', path: '/dashboard/overview', icon: LayoutDashboard },
        { label: 'Network Graph', path: '/dashboard/graph', icon: Network },
        { label: 'Forecast', path: '/dashboard/forecast', icon: TrendingUp },
        { label: 'Events', path: '/dashboard/events', icon: ShieldAlert },
      ],
    },
    {
      title: 'SIMULATION',
      items: [
        { label: 'Replay Control', path: '/simulation/replay', icon: PlayCircle },
        { label: 'Settings', path: '/simulation/settings', icon: Sliders },
      ],
    },
    {
      title: 'ANALYSIS',
      items: [
        { label: 'MITRE ATT&CK', path: '/analysis/mitre', icon: Grid },
        { label: 'Host Details', path: '/analysis/host-details', icon: Server },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'System Status', path: '/system-status', icon: Activity },
        { label: 'Caspian Config', path: '/caspian-config', icon: Cpu },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:static top-0 left-0 bottom-0 z-50 w-64 border-r border-soc-border bg-soc-card flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-md border-b border-soc-border flex items-center space-x-sm">
          <div className="p-sm bg-soc-input border border-soc-border rounded-lg text-soc-cyan">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-soc-primary tracking-wider">
              SENTINEL<span className="text-soc-cyan">GRAPH</span>
            </h1>
            <p className="text-[10px] text-soc-muted uppercase tracking-widest font-mono">
              SOC Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto p-md space-y-lg">
          {sections.map((section) => (
            <div key={section.title} className="space-y-xs">
              <h2 className="px-sm text-[11px] font-bold text-soc-muted uppercase tracking-wider font-mono">
                {section.title}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `flex items-center space-x-sm px-sm py-sm rounded-lg text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-soc-input text-soc-cyan border border-soc-border shadow-sm'
                            : 'text-soc-secondary hover:text-soc-primary hover:bg-soc-input/60'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Info */}
        <div className="p-md border-t border-soc-border bg-soc-input/40 text-[11px] text-soc-muted space-y-1">
          <div className="flex justify-between items-center text-soc-secondary font-mono">
            <span>Sentinel OS</span>
            <span className="text-soc-neon-green font-bold">v2.4.0</span>
          </div>
          <p className="text-soc-muted text-[10px]">Cybersecurity Operations Platform</p>
        </div>
      </aside>
    </>
  );
};
