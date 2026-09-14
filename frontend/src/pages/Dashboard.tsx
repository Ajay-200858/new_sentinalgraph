import React from 'react';
import { Overview } from '../components/dashboard/Overview';
import { NetworkGraph } from '../components/dashboard/NetworkGraph';
import { Forecast } from '../components/dashboard/Forecast';
import { Events } from '../components/dashboard/Events';

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <p className="text-xs text-slate-400">SentinelGraph Security Intelligence Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Overview />
        <NetworkGraph />
        <Forecast />
        <Events />
      </div>
    </div>
  );
};

export default Dashboard;
