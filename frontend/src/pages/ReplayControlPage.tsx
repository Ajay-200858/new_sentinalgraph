import React from 'react';
import { ReplayControl } from '../components/simulation/ReplayControl';

export const ReplayControlPage: React.FC = () => {
  return (
    <div className="space-y-md">
      <div className="flex justify-between items-center border-b border-soc-border pb-sm">
        <div>
          <h2 className="text-xl font-bold text-soc-primary tracking-tight">Replay Control</h2>
          <p className="text-xs text-soc-secondary font-mono">
            Replay network traffic datasets to analyze attack behavior.
          </p>
        </div>
      </div>

      <ReplayControl />
    </div>
  );
};

export default ReplayControlPage;
