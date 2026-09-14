import React from 'react';
import { Shield } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Telemetry Records Found',
  message = 'No matching events, hosts, or graph nodes match your current search query.',
  icon: Icon = Shield,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="p-lg bg-soc-card border border-soc-border rounded-lg flex flex-col items-center justify-center text-center space-y-md my-md font-mono">
      <div className="p-md bg-soc-input border border-soc-border rounded-full text-soc-muted">
        <Icon className="w-8 h-8" />
      </div>

      <div className="space-y-xs max-w-md">
        <h4 className="text-base font-bold text-soc-primary">{title}</h4>
        <p className="text-xs text-soc-muted leading-relaxed">{message}</p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-md py-sm bg-soc-input border border-soc-border hover:border-soc-cyan text-soc-primary rounded-md text-xs font-bold transition-all hover:bg-soc-input/80"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
