import React, { ElementType } from 'react';
import { StatusBadge, StatusType } from './StatusBadge';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: ElementType;
  subtitle?: string;
  trend?: {
    value: string | number;
    isPositive?: boolean;
  };
  status?: StatusType | string;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  status,
  className = '',
}) => {
  return (
    <div
      className={`p-md bg-soc-card border border-soc-border rounded-lg space-y-xs transition-colors hover:border-soc-border/80 ${className}`}
    >
      {/* Top Row: Title & Optional Icon/Status */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-soc-secondary uppercase tracking-wider font-mono">
          {title}
        </span>
        {status ? (
          <StatusBadge status={status} size="sm" />
        ) : Icon ? (
          <div className="p-xs bg-soc-input border border-soc-border rounded text-soc-cyan">
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
      </div>

      {/* Middle Row: Primary Value */}
      <div className="text-2xl font-bold text-soc-primary font-mono tracking-tight">{value}</div>

      {/* Bottom Row: Subtitle or Trend indicator */}
      {(subtitle || trend) && (
        <div className="flex items-center space-x-xs text-xs font-mono">
          {trend && (
            <span
              className={`flex items-center space-x-[2px] font-semibold ${
                trend.isPositive !== false ? 'text-[#00ff88]' : 'text-[#ff0055]'
              }`}
            >
              {trend.isPositive !== false ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.value}</span>
            </span>
          )}
          {subtitle && <span className="text-soc-muted">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

export default KpiCard;
