import React, { useState } from 'react';
import { EventSeverity } from '../../types/events';
import { StatusBadge } from '../common/StatusBadge';
import { Toast } from '../common/Toast';
import { Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface RecommendationCardProps {
  action: string;
  risk: EventSeverity;
  reason: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  action,
  risk,
  reason,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [executed, setExecuted] = useState<boolean>(false);

  const handleAction = () => {
    setExecuted(true);
    setToastMessage(`Initiated investigation protocol for active threat profile.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md relative">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <Toast message={toastMessage} />
        </div>
      )}

      <div className="flex justify-between items-center border-b border-soc-border pb-sm">
        <div className="flex items-center space-x-sm">
          <Zap className="w-5 h-5 text-soc-warning" />
          <h3 className="text-sm font-bold text-soc-primary font-mono">Recommended Action</h3>
        </div>
        <StatusBadge status={risk} size="sm" />
      </div>

      <div className="space-y-sm font-mono text-xs">
        <div className="p-sm bg-soc-input border border-soc-border rounded-lg space-y-xs">
          <span className="text-[10px] text-soc-muted uppercase block">Action Item:</span>
          <span className="font-bold text-soc-warning text-sm">{action}</span>
        </div>

        <div className="p-sm bg-soc-input/40 border border-soc-border/40 rounded-lg space-y-xs">
          <span className="text-[10px] text-soc-muted uppercase block">Analysis Rationale:</span>
          <p className="text-soc-secondary leading-relaxed">{reason}</p>
        </div>
      </div>

      <button
        onClick={handleAction}
        disabled={executed}
        className={`w-full py-sm px-md rounded-lg font-mono text-xs font-bold transition-colors flex items-center justify-center space-x-xs border ${
          executed
            ? 'bg-soc-neon-green/10 border-soc-neon-green/40 text-soc-neon-green'
            : 'bg-soc-warning/10 border-soc-warning/40 text-soc-warning hover:bg-soc-warning/20'
        }`}
      >
        {executed ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Investigation Protocol Initiated</span>
          </>
        ) : (
          <>
            <ShieldAlert className="w-4 h-4" />
            <span>Investigate Host Profile</span>
          </>
        )}
      </button>
    </div>
  );
};
