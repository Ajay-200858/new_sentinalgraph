import React from 'react';
import { Network } from 'lucide-react';

export const ThreatGraphPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Threat Graph Visualizer</h2>
        <p className="text-sm text-slate-400">Interactive network topology map powered by Cytoscape.js.</p>
      </div>

      <div className="h-[500px] bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center space-y-3">
        <Network className="w-12 h-12 text-cyan-500/60 animate-pulse" />
        <h3 className="text-lg font-medium text-slate-200">Cytoscape Graph Workspace Shell</h3>
        <p className="text-sm text-slate-400 max-w-md">
          Project foundation initialized. Ready for graph canvas integration and threat propagation rendering.
        </p>
      </div>
    </div>
  );
};
