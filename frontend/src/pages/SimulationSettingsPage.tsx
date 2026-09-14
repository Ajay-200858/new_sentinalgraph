import React from 'react';
import { Settings } from '../components/simulation/Settings';

export const SimulationSettingsPage: React.FC = () => {
  return (
    <div className="space-y-md">
      <div className="flex justify-between items-center border-b border-soc-border pb-sm">
        <div>
          <h2 className="text-xl font-bold text-soc-primary tracking-tight">Simulation Settings</h2>
          <p className="text-xs text-soc-secondary font-mono">
            Configure replay and monitoring behavior.
          </p>
        </div>
      </div>

      <Settings />
    </div>
  );
};

export default SimulationSettingsPage;
