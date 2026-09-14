import React from 'react';
import { HostDetailsData } from '../../types/analysis';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBar } from '../common/RiskBar';
import { Server, Activity, ShieldAlert, Clock } from 'lucide-react';

interface HostOverviewProps {
  host: HostDetailsData;
}

export const HostOverview: React.FC<HostOverviewProps> = ({ host }) => {
  return (
    <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
      {/* Header Info */}
      <div className="flex justify-between items-start border-b border-soc-border pb-sm">
        <div className="flex items-center space-x-sm">
          <div className="p-xs bg-soc-cyan/10 border border-soc-cyan/30 rounded text-soc-cyan">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-soc-muted block">
              Host Telemetry Profile
            </span>
            <h3 className="text-lg font-bold text-soc-primary font-mono">{host.ipAddress}</h3>
          </div>
        </div>
        <StatusBadge status={host.riskLevel} />
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-xs font-mono text-xs">
        <div className="p-xs bg-soc-input border border-soc-border rounded">
          <span className="text-[10px] text-soc-muted uppercase block">Host Type</span>
          <span className="font-bold text-soc-primary">{host.hostType}</span>
        </div>
        <div className="p-xs bg-soc-input border border-soc-border rounded">
          <span className="text-[10px] text-soc-muted uppercase block">Status</span>
          <span className="font-bold text-soc-warning">{host.status}</span>
        </div>
        <div className="p-xs bg-soc-input border border-soc-border rounded">
          <span className="text-[10px] text-soc-muted uppercase block">Risk Score</span>
          <span className="font-bold text-soc-danger">{host.riskScore} / 100</span>
        </div>
        <div className="p-xs bg-soc-input border border-soc-border rounded">
          <span className="text-[10px] text-soc-muted uppercase block">Last Seen</span>
          <span className="font-bold text-soc-primary">{host.lastSeen}</span>
        </div>
      </div>

      {/* Risk Information Section */}
      <div className="p-sm bg-soc-input/60 border border-soc-border/60 rounded-lg space-y-sm">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="font-bold text-soc-primary">Current Host Risk Level</span>
          <span className="text-soc-danger font-bold">{host.riskScore}%</span>
        </div>
        <RiskBar score={host.riskScore} severity={host.riskLevel} showPercentage={false} />

        <div className="grid grid-cols-3 gap-xs pt-xs text-xs font-mono">
          <div className="flex items-center space-x-xs text-soc-secondary">
            <Activity className="w-3.5 h-3.5 text-soc-cyan" />
            <span>Risk Trend:</span>
            <span className="font-bold text-soc-primary">{host.riskTrend}</span>
          </div>
          <div className="flex items-center space-x-xs text-soc-secondary">
            <ShieldAlert className="w-3.5 h-3.5 text-soc-warning" />
            <span>Attack Rate:</span>
            <span className="font-bold text-soc-primary">{host.attackRate}</span>
          </div>
          <div className="flex items-center space-x-xs text-soc-secondary">
            <Clock className="w-3.5 h-3.5 text-soc-cyan" />
            <span>Flow Count:</span>
            <span className="font-bold text-soc-primary">{host.flowCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
