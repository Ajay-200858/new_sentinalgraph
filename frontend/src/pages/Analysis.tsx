import React from 'react';
import { MitreMatrix } from '../components/analysis/MitreMatrix';
import { HostDetails } from '../components/analysis/HostDetails';

export const Analysis: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Analysis</h2>
        <p className="text-xs text-slate-400">Deep Threat Matrix & Host Telemetry</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MitreMatrix />
        <HostDetails />
      </div>
    </div>
  );
};

export default Analysis;
