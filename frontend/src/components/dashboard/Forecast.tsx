import React, { useState } from 'react';
import {
  AlertTriangle,
  Zap,
  Clock,
  ShieldAlert,
  Server,
  Lock,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBar } from '../common/RiskBar';
import { Toast } from '../common/Toast';
import { useDashboardStore } from '../../store/dashboardStore';

export const Forecast: React.FC = () => {
  const currentThreat = useDashboardStore((state) => state.forecast.currentThreat);
  const escalations = useDashboardStore((state) => state.forecast.escalations);
  const recommendation = useDashboardStore((state) => state.forecast.recommendation);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [executedAction, setExecutedAction] = useState<boolean>(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExecuteAction = () => {
    setExecutedAction(true);
    triggerToast(
      `Mitigation Action Triggered: Host ${recommendation.hostIp} successfully isolated.`
    );
  };

  return (
    <div className="space-y-lg relative">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <Toast message={toastMessage} />
        </div>
      )}

      {/* TOP ROW: SECTION 1 (CURRENT THREAT) & SECTION 3 (AI RECOMMENDATION) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* SECTION 1 — CURRENT THREAT CARD */}
        <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md flex flex-col justify-between">
          <div className="flex justify-between items-start border-b border-soc-border pb-sm">
            <div className="flex items-center space-x-sm">
              <div className="p-xs bg-soc-danger/10 border border-soc-danger/30 rounded text-soc-danger">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-soc-muted block">
                  Active Threat State
                </span>
                <h3 className="text-base font-bold text-soc-primary font-mono">
                  {currentThreat.threatName}
                </h3>
              </div>
            </div>
            <StatusBadge status={currentThreat.riskLevel} />
          </div>

          {/* Probability & Description */}
          <div className="space-y-sm">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-soc-secondary">Confidence Probability:</span>
              <span className="font-bold text-soc-primary text-sm">
                {currentThreat.probability}%
              </span>
            </div>
            <RiskBar
              score={currentThreat.probability}
              severity={currentThreat.riskLevel}
              showPercentage={false}
            />

            <div className="p-sm bg-soc-input/60 border border-soc-border/60 rounded text-xs text-soc-secondary leading-relaxed font-mono">
              {currentThreat.explanation}
            </div>
          </div>

          {/* Card Footer Info */}
          <div className="grid grid-cols-2 gap-xs pt-xs border-t border-soc-border/60 text-xs font-mono">
            <div className="flex items-center space-x-xs text-soc-secondary">
              <Server className="w-4 h-4 text-soc-cyan" />
              <span>Affected:</span>
              <span className="font-bold text-soc-primary">
                {currentThreat.affectedHostCount} Hosts
              </span>
            </div>
            <div className="text-right text-soc-muted">
              <span>Detected: {currentThreat.detectedTime}</span>
            </div>
          </div>
        </div>

        {/* SECTION 3 — AI RECOMMENDATION PANEL */}
        <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md flex flex-col justify-between">
          <div className="flex justify-between items-start border-b border-soc-border pb-sm">
            <div className="flex items-center space-x-sm">
              <div className="p-xs bg-soc-cyan/10 border border-soc-cyan/30 rounded text-soc-cyan">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-soc-cyan block">
                  AI Prescriptive Response
                </span>
                <h3 className="text-base font-bold text-soc-primary font-mono">
                  Recommended Defense Action
                </h3>
              </div>
            </div>
            <span className="text-xs font-mono px-sm py-xs bg-soc-input border border-soc-border rounded text-soc-neon-green">
              {recommendation.confidenceScore}% AI Confidence
            </span>
          </div>

          {/* Action Details */}
          <div className="space-y-sm font-mono text-xs">
            <div className="p-sm bg-soc-input border border-soc-border rounded space-y-xs">
              <span className="text-[10px] uppercase text-soc-muted block">Recommended Action:</span>
              <div className="font-bold text-soc-cyan text-sm flex items-center space-x-xs">
                <Lock className="w-4 h-4 text-soc-warning" />
                <span>{recommendation.action}</span>
              </div>
            </div>

            <div className="space-y-xs text-soc-secondary text-xs leading-relaxed">
              <span className="text-soc-muted font-semibold block">Rationale & Analysis:</span>
              <p className="bg-soc-input/40 p-xs border border-soc-border/40 rounded">
                {recommendation.reason}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-xs pt-xs">
              <div>
                <span className="text-[10px] text-soc-muted uppercase block">Related Threat</span>
                <span className="font-semibold text-soc-primary">
                  {recommendation.relatedThreat}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-soc-muted uppercase block">Target Host IP</span>
                <span className="font-bold text-soc-danger">{recommendation.hostIp}</span>
              </div>
            </div>
          </div>

          {/* Execution Button */}
          <button
            onClick={handleExecuteAction}
            disabled={executedAction}
            className={`w-full py-sm px-md rounded-md font-mono text-xs font-bold transition-all flex items-center justify-center space-x-xs border ${
              executedAction
                ? 'bg-soc-neon-green/10 border-soc-neon-green/40 text-soc-neon-green cursor-not-allowed'
                : 'bg-soc-danger/20 border-soc-danger/60 text-soc-danger hover:bg-soc-danger/30 hover:border-soc-danger'
            }`}
          >
            {executedAction ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Action Executed — Host Quarantined</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Execute Recommended Isolation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 2 — ESCALATION FORECAST TIMELINE */}
      <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
        <div className="flex justify-between items-center border-b border-soc-border pb-sm">
          <div className="flex items-center space-x-sm">
            <Clock className="w-5 h-5 text-soc-cyan" />
            <div>
              <h3 className="text-base font-bold text-soc-primary">
                Predictive Attack Escalation Timeline
              </h3>
              <p className="text-xs text-soc-muted font-mono">
                Forward-looking security risk probability forecast
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-soc-secondary bg-soc-input px-sm py-xs border border-soc-border rounded-md">
            {escalations.length} Predictions Queued
          </span>
        </div>

        {/* Escalation Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {escalations.map((card) => (
            <div
              key={card.id}
              className="p-md bg-soc-input/60 border border-soc-border rounded-lg space-y-sm flex flex-col justify-between hover:border-soc-border/90 transition-colors"
            >
              {/* Header: Timeline Badge & Severity */}
              <div className="flex justify-between items-center">
                <span className="px-sm py-xs bg-soc-card border border-soc-border rounded text-xs font-mono font-bold text-soc-cyan flex items-center space-x-xs">
                  <Clock className="w-3 h-3 text-soc-cyan" />
                  <span>{card.timeline}</span>
                </span>
                <StatusBadge status={card.severity} size="sm" />
              </div>

              {/* Threat Name */}
              <div className="space-y-xs">
                <h4 className="text-sm font-bold text-soc-primary font-mono leading-tight">
                  {card.threatName}
                </h4>
                <div className="flex items-center space-x-xs text-[11px] font-mono text-soc-muted">
                  <HelpCircle className="w-3 h-3 text-soc-secondary" />
                  <span>{card.mitreTactic}</span>
                </div>
              </div>

              {/* Probability Progress Bar */}
              <div className="space-y-xs pt-xs">
                <RiskBar
                  score={card.probability}
                  label="Probability"
                  severity={card.severity}
                />
              </div>

              {/* MITRE ATT&CK Tactic Badge & Hosts */}
              <div className="space-y-xs pt-xs border-t border-soc-border/60 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-soc-muted uppercase">MITRE Technique:</span>
                  <span className="px-xs py-[2px] bg-soc-card border border-soc-border rounded text-[10px] text-soc-secondary">
                    {card.mitreId}
                  </span>
                </div>

                <div className="flex flex-wrap gap-xs pt-xs">
                  {card.affectedHosts.map((hostIp) => (
                    <span
                      key={hostIp}
                      className="px-xs py-[1px] bg-soc-card border border-soc-border/60 text-[10px] text-soc-primary rounded"
                    >
                      {hostIp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Badge */}
              <div className="pt-xs">
                <div className="w-full py-xs px-sm bg-soc-card border border-soc-border rounded text-[11px] font-mono font-semibold text-soc-secondary text-center">
                  {card.recommendedAction}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Forecast;
