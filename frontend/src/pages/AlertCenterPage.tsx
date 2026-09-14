import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const AlertCenterPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Alert Center</h2>
        <p className="text-sm text-slate-400">Security event feed and threat investigation console.</p>
      </div>

      <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
        <AlertTriangle className="w-12 h-12 text-rose-500/60" />
        <h3 className="text-lg font-medium text-slate-200">Alert Center Console Shell</h3>
        <p className="text-sm text-slate-400 max-w-md">
          Basic project structure configured. Alert filtering and detailed telemetry inspector ready for build phase.
        </p>
      </div>
    </div>
  );
};
