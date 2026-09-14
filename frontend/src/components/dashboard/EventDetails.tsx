import React from 'react';
import { SecurityEventData } from '../../types/events';
import { SeverityBadge } from '../common/SeverityBadge';
import { RiskBar } from '../common/RiskBar';
import { StatusBadge } from '../common/StatusBadge';
import { Shield, X, Server, Clock, Activity, AlertTriangle } from 'lucide-react';

interface EventDetailsProps {
  event: SecurityEventData | null;
  onClose: () => void;
}

export const EventDetails: React.FC<EventDetailsProps> = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-md">
      <div className="bg-soc-card border border-soc-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl space-y-md animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-md bg-soc-input/80 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center space-x-sm">
            <div className="p-xs bg-soc-card border border-soc-border rounded text-soc-cyan">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-soc-muted block">
                Event Telemetry Inspector
              </span>
              <h3 className="text-base font-bold text-soc-primary font-mono">{event.id}</h3>
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
          {/* Status & Severity Top Row */}
          <div className="flex justify-between items-center p-sm bg-soc-input border border-soc-border rounded-lg">
            <div className="flex items-center space-x-xs">
              <Clock className="w-4 h-4 text-soc-secondary" />
              <span className="text-soc-secondary">{event.timestamp}</span>
            </div>
            <div className="flex items-center space-x-xs">
              <StatusBadge status={event.status} size="sm" />
              <SeverityBadge severity={event.severity} riskScore={event.riskScore} size="sm" />
            </div>
          </div>

          {/* Network Connection Flow Details */}
          <div className="grid grid-cols-2 gap-sm">
            {/* Source */}
            <div className="p-sm bg-soc-input border border-soc-border rounded-lg space-y-xs">
              <div className="flex items-center space-x-xs text-soc-muted">
                <Activity className="w-3.5 h-3.5 text-soc-cyan" />
                <span className="text-[10px] uppercase font-bold">Source Endpoint</span>
              </div>
              <div className="text-sm font-bold text-soc-primary">{event.sourceIp}</div>
              <div className="text-[11px] text-soc-secondary">Port: {event.sourcePort}</div>
            </div>

            {/* Destination */}
            <div className="p-sm bg-soc-input border border-soc-border rounded-lg space-y-xs">
              <div className="flex items-center space-x-xs text-soc-muted">
                <Server className="w-3.5 h-3.5 text-soc-cyan" />
                <span className="text-[10px] uppercase font-bold">Destination Endpoint</span>
              </div>
              <div className="text-sm font-bold text-soc-primary">{event.destinationIp}</div>
              <div className="text-[11px] text-soc-secondary">Port: {event.destinationPort}</div>
            </div>
          </div>

          {/* SECURITY ASSESSMENT CARD */}
          <div className="p-sm bg-soc-input/80 border border-soc-border rounded-lg space-y-sm">
            <div className="flex items-center space-x-xs text-soc-warning font-bold border-b border-soc-border/60 pb-xs">
              <AlertTriangle className="w-4 h-4" />
              <span className="uppercase text-xs tracking-wider">Security Assessment</span>
            </div>

            <div className="grid grid-cols-3 gap-xs text-[11px]">
              <div>
                <span className="text-soc-muted block">Risk Score:</span>
                <span className="font-bold text-soc-danger">{event.riskScore} / 100</span>
              </div>
              <div>
                <span className="text-soc-muted block">Threat Vector:</span>
                <span className="font-bold text-soc-primary">{event.eventType}</span>
              </div>
              <div>
                <span className="text-soc-muted block">Severity Level:</span>
                <span className="font-bold text-soc-warning">{event.severity}</span>
              </div>
            </div>

            <RiskBar score={event.riskScore} severity={event.severity} showPercentage={false} />
          </div>

          {/* Description Payload */}
          {event.description && (
            <div className="p-sm bg-soc-input border border-soc-border rounded-lg space-y-xs">
              <span className="text-[10px] text-soc-muted uppercase block font-bold">
                Telemetry Log Payload
              </span>
              <p className="text-xs text-soc-secondary leading-relaxed font-mono">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-md bg-soc-input/40 border-t border-soc-border flex justify-end">
          <button
            onClick={onClose}
            className="px-md py-xs bg-soc-input border border-soc-border hover:border-soc-cyan text-soc-primary rounded-lg font-mono text-xs font-bold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
