import React from 'react';
import { ReplayControl } from '../components/simulation/ReplayControl';
import { Settings } from '../components/simulation/Settings';

export const Simulation: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Simulation</h2>
        <p className="text-xs text-slate-400">Attack Replay & Scenario Controls</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReplayControl />
        <Settings />
      </div>
    </div>
  );
};

export default Simulation;
