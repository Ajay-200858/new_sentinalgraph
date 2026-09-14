import React from 'react';

export type StatusType =
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical'
  | 'Streaming'
  | 'Stopped'
  | 'Healthy'
  | 'Warning';

export interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  className = '',
}) => {
  const getStatusStyles = (statusVal: string) => {
    const normalized = statusVal.toUpperCase();

    switch (normalized) {
      case 'STREAMING':
      case 'HEALTHY':
      case 'LOW':
        return {
          bg: 'bg-[#00ff88]/10',
          border: 'border-[#00ff88]/30',
          text: 'text-[#00ff88]',
          dot: 'bg-[#00ff88]',
        };
      case 'WARNING':
      case 'MEDIUM':
        return {
          bg: 'bg-[#ffaa00]/10',
          border: 'border-[#ffaa00]/30',
          text: 'text-[#ffaa00]',
          dot: 'bg-[#ffaa00]',
        };
      case 'HIGH':
        return {
          bg: 'bg-[#ff0055]/10',
          border: 'border-[#ff0055]/30',
          text: 'text-[#ff0055]',
          dot: 'bg-[#ff0055]',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-[#ff0000]/10',
          border: 'border-[#ff0000]/30',
          text: 'text-[#ff0000]',
          dot: 'bg-[#ff0000]',
        };
      case 'STOPPED':
      default:
        return {
          bg: 'bg-[#6b7280]/10',
          border: 'border-[#6b7280]/30',
          text: 'text-[#6b7280]',
          dot: 'bg-[#6b7280]',
        };
    }
  };

  const styles = getStatusStyles(status);
  const sizeClasses = size === 'sm' ? 'px-xs py-[2px] text-[10px]' : 'px-sm py-xs text-xs';

  return (
    <span
      className={`inline-flex items-center space-x-xs font-mono font-semibold rounded-full border ${styles.bg} ${styles.border} ${styles.text} ${sizeClasses} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      <span className="uppercase tracking-wider">{status}</span>
    </span>
  );
};

export default StatusBadge;
