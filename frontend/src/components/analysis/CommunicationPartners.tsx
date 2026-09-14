import React from 'react';
import { CommunicationPartner } from '../../types/analysis';
import { StatusBadge } from '../common/StatusBadge';
import { Network, Activity } from 'lucide-react';

interface CommunicationPartnersProps {
  partners: CommunicationPartner[];
}

export const CommunicationPartners: React.FC<CommunicationPartnersProps> = ({ partners }) => {
  return (
    <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
      <div className="flex justify-between items-center border-b border-soc-border pb-sm">
        <div className="flex items-center space-x-sm">
          <Network className="w-5 h-5 text-soc-cyan" />
          <h3 className="text-sm font-bold text-soc-primary font-mono">Communication Partners</h3>
        </div>
        <span className="text-xs font-mono text-soc-secondary bg-soc-input px-sm py-xs border border-soc-border rounded">
          {partners.length} Active Edges
        </span>
      </div>

      <div className="space-y-xs">
        {partners.map((partner) => (
          <div
            key={partner.ip}
            className="p-sm bg-soc-input/60 border border-soc-border hover:border-soc-cyan rounded-lg flex items-center justify-between font-mono text-xs transition-colors"
          >
            <div className="flex items-center space-x-sm">
              <Activity className="w-4 h-4 text-soc-cyan" />
              <div>
                <span className="font-bold text-soc-primary block">{partner.ip}</span>
                <span className="text-[10px] text-soc-muted">
                  Flows: {partner.flowCount.toLocaleString()}
                </span>
              </div>
            </div>
            <StatusBadge status={partner.riskStatus} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
};
