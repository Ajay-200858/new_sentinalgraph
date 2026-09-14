import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
}) => {
  const typeConfig = {
    success: {
      icon: CheckCircle2,
      border: 'border-soc-neon-green/60',
      text: 'text-soc-neon-green',
      bg: 'bg-soc-input',
    },
    warning: {
      icon: AlertTriangle,
      border: 'border-soc-warning/60',
      text: 'text-soc-warning',
      bg: 'bg-soc-input',
    },
    error: {
      icon: AlertCircle,
      border: 'border-soc-danger/60',
      text: 'text-soc-danger',
      bg: 'bg-soc-input',
    },
    info: {
      icon: Info,
      border: 'border-soc-cyan/60',
      text: 'text-soc-cyan',
      bg: 'bg-soc-input',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`p-sm md:p-md ${config.bg} border ${config.border} ${config.text} text-xs font-mono rounded-lg shadow-2xl flex items-center justify-between space-x-md min-w-[280px] max-w-md transition-all`}
    >
      <div className="flex items-center space-x-sm">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-medium leading-tight">{message}</span>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close notification"
          className="text-soc-muted hover:text-soc-primary p-xs rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default Toast;
