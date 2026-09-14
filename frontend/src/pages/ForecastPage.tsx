import React from 'react';
import { Forecast } from '../components/dashboard/Forecast';

export const ForecastPage: React.FC = () => {
  return (
    <div className="space-y-md">
      <div className="flex justify-between items-center border-b border-soc-border pb-sm">
        <div>
          <h2 className="text-xl font-bold text-soc-primary tracking-tight">
            Attack Escalation & Predictive Risk Forecast
          </h2>
          <p className="text-xs text-soc-secondary font-mono">
            AI-powered threat propagation forecast, MITRE ATT&CK trajectory & defense recommendations
          </p>
        </div>
      </div>

      <Forecast />
    </div>
  );
};

export default ForecastPage;
