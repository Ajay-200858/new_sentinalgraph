import React from 'react';
import { NetworkGraph } from '../components/dashboard/NetworkGraph';

export const NetworkGraphPage: React.FC = () => {
  return (
    <div className="space-y-md">
      <div className="flex justify-between items-center border-b border-soc-border pb-sm">
        <div>
          <h2 className="text-xl font-bold text-soc-primary tracking-tight">Interactive Network Threat Graph</h2>
          <p className="text-xs text-soc-secondary font-mono">
            Cytoscape.js topological IP flow visualization & node inspector
          </p>
        </div>
      </div>

      <NetworkGraph />
    </div>
  );
};

export default NetworkGraphPage;
