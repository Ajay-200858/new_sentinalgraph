import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Telemetry Data',
  message = 'Failed to fetch the latest security data stream from backend.',
  onRetry,
}) => {
  return (
    <div className="p-lg bg-soc-card border border-soc-danger/40 rounded-lg flex flex-col items-center justify-center text-center space-y-md my-md font-mono">
      <div className="p-md bg-soc-danger/10 border border-soc-danger/30 rounded-full text-soc-danger">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-xs max-w-md">
        <h4 className="text-base font-bold text-soc-primary">{title}</h4>
        <p className="text-xs text-soc-muted leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-md py-sm bg-soc-input border border-soc-border hover:border-soc-cyan text-soc-cyan rounded-md text-xs font-bold transition-all flex items-center space-x-xs hover:bg-soc-cyan/10"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
