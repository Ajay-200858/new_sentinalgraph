import React from 'react';
import { Settings } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">System Settings</h2>
        <p className="text-sm text-slate-400">Manage SentinelGraph frontend preferences and mock data thresholds.</p>
      </div>

      <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
        <Settings className="w-12 h-12 text-slate-500/60" />
        <h3 className="text-lg font-medium text-slate-200">Settings Shell</h3>
        <p className="text-sm text-slate-400 max-w-md">
          Basic project configuration active.
        </p>
      </div>
    </div>
  );
};
