import React from 'react';
import { MitreTechniqueData } from '../../types/analysis';
import { SeverityBadge } from '../common/SeverityBadge';
import { Grid, X, Shield, Server, Lightbulb } from 'lucide-react';

interface TechniqueDetailsProps {
  technique: MitreTechniqueData | null;
  onClose: () => void;
}

export const TechniqueDetails: React.FC<TechniqueDetailsProps> = ({ technique, onClose }) => {
  if (!technique) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-md">
      <div className="bg-soc-card border border-soc-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl space-y-md animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-md bg-soc-input/80 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center space-x-sm">
            <div className="p-xs bg-soc-card border border-soc-border rounded text-soc-cyan">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-soc-muted block">
                MITRE Technique Inspector
              </span>
              <h3 className="text-base font-bold text-soc-primary font-mono">{technique.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Inspector"
            className="text-soc-muted hover:text-soc-primary p-xs rounded hover:bg-soc-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-md space-y-md max-h-[75vh] overflow-y-auto font-mono text-xs">
          {/* Technique ID & Severity Row */}
          <div className="flex justify-between items-center p-sm bg-soc-input border border-soc-border rounded-lg">
            <div>
              <span className="text-[10px] text-soc-muted uppercase block">Technique ID:</span>
              <span className="font-bold text-soc-cyan text-sm">{technique.id}</span>
            </div>
            <div>
              <span className="text-[10px] text-soc-muted uppercase block text-right">Tactic:</span>
              <span className="font-bold text-soc-primary">{technique.tactic}</span>
            </div>
            <SeverityBadge severity={technique.risk} showScore={false} size="sm" />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-sm">
            <div className="p-sm bg-soc-input border border-soc-border rounded-lg">
              <span className="text-[10px] text-soc-muted uppercase block">Total Detections</span>
              <span className="text-base font-bold text-soc-primary">
                {technique.detectionCount} Detections
              </span>
            </div>
            <div className="p-sm bg-soc-input border border-soc-border rounded-lg">
              <span className="text-[10px] text-soc-muted uppercase block">Affected Hosts Count</span>
              <span className="text-base font-bold text-soc-primary">
                {technique.affectedHosts.length} Hosts
              </span>
            </div>
          </div>

          {/* Affected Hosts Pills */}
          <div className="space-y-xs">
            <span className="text-soc-secondary font-semibold block flex items-center space-x-xs">
              <Server className="w-3.5 h-3.5 text-soc-cyan" />
              <span>Affected Host IP List</span>
            </span>
            <div className="flex flex-wrap gap-xs">
              {technique.affectedHosts.map((ip) => (
                <span
                  key={ip}
                  className="px-sm py-xs bg-soc-input border border-soc-border rounded text-soc-primary font-bold"
                >
                  {ip}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="p-sm bg-soc-input/60 border border-soc-border/60 rounded-lg space-y-xs">
            <span className="text-[10px] text-soc-muted uppercase font-bold block flex items-center space-x-xs">
              <Shield className="w-3.5 h-3.5 text-soc-cyan" />
              <span>Technique Description</span>
            </span>
            <p className="text-soc-secondary leading-relaxed font-mono">{technique.description}</p>
          </div>

          {/* Recommended Action */}
          <div className="p-sm bg-soc-input/80 border border-soc-cyan/30 rounded-lg space-y-xs">
            <span className="text-[10px] text-soc-cyan uppercase font-bold block flex items-center space-x-xs">
              <Lightbulb className="w-3.5 h-3.5 text-soc-warning" />
              <span>Recommended Defense Action</span>
            </span>
            <p className="text-soc-primary font-semibold leading-relaxed font-mono">
              {technique.recommendedAction}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-md bg-soc-input/40 border-t border-soc-border flex justify-end">
          <button
            onClick={onClose}
            className="px-md py-xs bg-soc-input border border-soc-border hover:border-soc-cyan text-soc-primary rounded-lg font-mono text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
