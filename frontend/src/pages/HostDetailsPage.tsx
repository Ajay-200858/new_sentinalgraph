import React from 'react';
import { HostDetails } from '../components/analysis/HostDetails';

export const HostDetailsPage: React.FC = () => {
  return (
    <div className="space-y-md">
      <div className="flex justify-between items-center border-b border-soc-border pb-sm">
        <div>
          <h2 className="text-xl font-bold text-soc-primary tracking-tight">Host Details</h2>
          <p className="text-xs text-soc-secondary font-mono">
            Investigate host-level security activity and risk.
          </p>
        </div>
      </div>

      <HostDetails />
    </div>
  );
};

export default HostDetailsPage;
