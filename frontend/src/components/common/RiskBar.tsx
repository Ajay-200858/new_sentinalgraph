import React from 'react';

export interface RiskBarProps {
  score: number; // Numeric risk score 0 - 100
  label?: string;
  severity?: 'Low' | 'Medium' | 'High' | 'Critical' | 'Isolated';
  showPercentage?: boolean;
  className?: string;
}

export const RiskBar: React.FC<RiskBarProps> = ({
  score,
  label,
  severity,
  showPercentage = true,
  className = '',
}) => {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score));

  // Determine bar fill color based on score or severity override
  const getFillColor = () => {
    if (severity) {
      switch (severity.toUpperCase()) {
        case 'LOW':
          return 'bg-[#00ff88]';
        case 'MEDIUM':
          return 'bg-[#ffaa00]';
        case 'HIGH':
          return 'bg-[#ff0055]';
        case 'CRITICAL':
          return 'bg-[#ff0000]';
        case 'ISOLATED':
          return 'bg-[#6b7280]';
      }
    }

    if (clampedScore >= 85) return 'bg-[#ff0000]'; // Critical
    if (clampedScore >= 60) return 'bg-[#ff0055]'; // High
    if (clampedScore >= 30) return 'bg-[#ffaa00]'; // Medium
    return 'bg-[#00ff88]'; // Low
  };

  const fillColor = getFillColor();

  return (
    <div className={`space-y-xs w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs font-mono">
          {label && <span className="text-soc-secondary font-semibold">{label}</span>}
          {showPercentage && <span className="text-soc-primary font-bold">{clampedScore}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-soc-input border border-soc-border rounded-full overflow-hidden p-[1px]">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${fillColor}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  );
};

export default RiskBar;
