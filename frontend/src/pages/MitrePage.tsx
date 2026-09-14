import React from 'react';
import { MitreMatrix } from '../components/analysis/MitreMatrix';

export const MitrePage: React.FC = () => {
  return (
    <div className="space-y-md">
      <div className="flex justify-between items-center border-b border-soc-border pb-sm">
        <div>
          <h2 className="text-xl font-bold text-soc-primary tracking-tight">MITRE ATT&CK</h2>
          <p className="text-xs text-soc-secondary font-mono">
            Analyze detected threats against MITRE ATT&CK tactics and techniques.
          </p>
        </div>
      </div>

      <MitreMatrix />
    </div>
  );
};

export default MitrePage;
