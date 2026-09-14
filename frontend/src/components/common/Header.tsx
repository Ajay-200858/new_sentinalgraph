import React from 'react';
import { Shield, Bell, Activity, Search } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-wider">SENTINEL<span className="text-cyan-400">GRAPH</span></h1>
          <p className="text-xs text-slate-400">AI Threat Intelligence Engine</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search IP, node, threat ID..."
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:border-cyan-500 text-slate-200 placeholder-slate-500 w-64"
          />
        </div>

        <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>SYSTEM LIVE</span>
        </div>

        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
};
