import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Loading telemetry...',
  fullPage = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  const containerClasses = fullPage
    ? 'min-h-[400px] w-full flex flex-col items-center justify-center p-lg space-y-md font-mono'
    : 'flex items-center space-x-sm p-md font-mono text-xs text-soc-cyan';

  return (
    <div className={containerClasses}>
      <div
        className={`${sizeClasses[size]} border-soc-cyan/30 border-t-soc-cyan rounded-full animate-spin`}
      />
      {message && <span className="text-soc-secondary font-semibold">{message}</span>}
    </div>
  );
};

export default LoadingSpinner;
