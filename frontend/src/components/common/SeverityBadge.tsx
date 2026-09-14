import React from 'react';
import { EventSeverity } from '../../types/events';

export interface SeverityBadgeProps {
  severity: EventSeverity | string;
  riskScore?: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  riskScore,
  showScore = true,
  size = 'md',
  className = '',
}) => {
  const getSeverityStyles = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return {
          bg: 'bg-[#ff0000]/10',
          border: 'border-[#ff0000]/40',
          text: 'text-[#ff0000]',
          dot: 'bg-[#ff0000]',
        };
      case 'HIGH':
        return {
          bg: 'bg-[#ff0055]/10',
          border: 'border-[#ff0055]/40',
          text: 'text-[#ff0055]',
          dot: 'bg-[#ff0055]',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-[#ffaa00]/10',
          border: 'border-[#ffaa00]/40',
          text: 'text-[#ffaa00]',
          dot: 'bg-[#ffaa00]',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-[#00ff88]/10',
          border: 'border-[#00ff88]/40',
          text: 'text-[#00ff88]',
          dot: 'bg-[#00ff88]',
        };
    }
  };

  const styles = getSeverityStyles(severity);
  const sizeClasses = size === 'sm' ? 'px-xs py-[2px] text-[10px]' : 'px-sm py-xs text-xs';

  return (
    <span
      className={`inline-flex items-center space-x-xs font-mono font-semibold rounded-full border ${styles.bg} ${styles.border} ${styles.text} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      <span className="uppercase tracking-wider">{severity}</span>
      {showScore && riskScore !== undefined && (
        <span className="opacity-80 font-normal">
          (Risk {riskScore})
        </span>
      )}
    </span>
  );
};

export default SeverityBadge;
