import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Network, AlertTriangle, Settings } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Threat Graph', path: '/graph', icon: Network },
    { label: 'Alert Center', path: '/alerts', icon: AlertTriangle },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between h-[calc(100vh-4rem)]">
      <nav className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg text-xs text-slate-400 space-y-1">
        <div className="flex justify-between items-center text-slate-300 font-medium">
          <span>Frontend Engine</span>
          <span className="text-cyan-400 font-mono">v0.1.0</span>
        </div>
        <p className="text-slate-500">Hackathon Build - Standalone UI Mode</p>
      </div>
    </aside>
  );
};
