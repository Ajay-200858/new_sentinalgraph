import React from 'react';
import { Overview } from '../components/dashboard/Overview';

export const OverviewPage: React.FC = () => {
  return (
    <div className="space-y-lg">
      <div className="flex justify-between items-center border-b border-soc-border pb-md">
        <div>
          <h2 className="text-xl font-bold text-soc-primary tracking-tight">Security Command Dashboard</h2>
          <p className="text-xs text-soc-secondary">Real-time threat monitoring and graph intelligence overview</p>
        </div>
      </div>

      <Overview />
    </div>
  );
};

export default OverviewPage;
