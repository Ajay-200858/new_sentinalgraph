import React, { useState, useEffect } from 'react';
import { MOCK_HOSTS_DATA } from '../../mocks/hostsData';
import { HostDetailsData } from '../../types/analysis';
import { HostOverview } from './HostOverview';
import { CommunicationPartners } from './CommunicationPartners';
import { RecommendationCard } from './RecommendationCard';
import { SeverityBadge } from '../common/SeverityBadge';
import { analysisApi } from '../../utils/api/analysisApi';
import { Search, ShieldAlert, Clock, Activity } from 'lucide-react';

export const HostDetails: React.FC = () => {
  const [selectedIp, setSelectedIp] = useState<string>('10.0.0.21');
  const [currentHost, setCurrentHost] = useState<HostDetailsData>(
    MOCK_HOSTS_DATA['10.0.0.21']
  );

  const hostList = Object.keys(MOCK_HOSTS_DATA);

  useEffect(() => {
    let isMounted = true;
    analysisApi.getHostDetails(selectedIp).then((res) => {
      if (isMounted && res?.host) {
        setCurrentHost(res.host);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedIp]);

  return (
    <div className="space-y-lg">
      {/* HOST SEARCH & SELECTOR BAR */}
      <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-xs">
        <label className="text-xs font-semibold text-soc-secondary font-mono uppercase block">
          Search / Select Target IP Address
        </label>
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-soc-muted" />
          <select
            value={selectedIp}
            onChange={(e) => setSelectedIp(e.target.value)}
            className="w-full pl-9 pr-md py-xs bg-soc-input border border-soc-border rounded-lg text-soc-primary text-sm font-mono focus:outline-none focus:border-soc-cyan cursor-pointer"
          >
            {hostList.map((ip) => (
              <option key={ip} value={ip} className="bg-soc-card text-soc-primary">
                {ip} — Risk Score: {MOCK_HOSTS_DATA[ip].riskScore} ({MOCK_HOSTS_DATA[ip].riskLevel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP ROW: HOST OVERVIEW & RECOMMENDATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2">
          <HostOverview host={currentHost} />
        </div>
        <div>
          <RecommendationCard
            action={currentHost.recommendation.action}
            risk={currentHost.recommendation.risk}
            reason={currentHost.recommendation.reason}
          />
        </div>
      </div>

      {/* MIDDLE ROW: DETECTED THREATS & COMMUNICATION PARTNERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* DETECTED THREATS BREAKDOWN */}
        <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
          <div className="flex justify-between items-center border-b border-soc-border pb-sm">
            <div className="flex items-center space-x-sm">
              <ShieldAlert className="w-5 h-5 text-soc-warning" />
              <h3 className="text-sm font-bold text-soc-primary font-mono">Detected Threat Activity</h3>
            </div>
            <span className="text-xs font-mono text-soc-secondary bg-soc-input px-sm py-xs border border-soc-border rounded">
              {currentHost.detectedThreats.length} Categories
            </span>
          </div>

          <div className="space-y-xs">
            {currentHost.detectedThreats.map((threat) => (
              <div
                key={threat.threatName}
                className="p-sm bg-soc-input/60 border border-soc-border rounded-lg flex items-center justify-between font-mono text-xs"
              >
                <div>
                  <span className="font-bold text-soc-primary block">{threat.threatName}</span>
                  <span className="text-[10px] text-soc-muted">
                    Total Events Recorded: {threat.eventCount}
                  </span>
                </div>
                <SeverityBadge severity={threat.severity} showScore={false} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* COMMUNICATION PARTNERS */}
        <CommunicationPartners partners={currentHost.partners} />
      </div>

      {/* BOTTOM ROW: RECENT HOST EVENTS TABLE */}
      <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
        <div className="flex justify-between items-center border-b border-soc-border pb-sm">
          <div className="flex items-center space-x-sm">
            <Clock className="w-5 h-5 text-soc-cyan" />
            <div>
              <h3 className="text-sm font-bold text-soc-primary font-mono">Recent Security Events</h3>
              <p className="text-xs text-soc-muted font-mono">Host telemetry event log stream</p>
            </div>
          </div>
          <span className="text-xs font-mono text-soc-cyan bg-soc-input px-sm py-xs border border-soc-border rounded">
            Host Logs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-soc-border text-soc-muted uppercase tracking-wider">
                <th className="py-sm px-sm">Time</th>
                <th className="py-sm px-sm">Event Type</th>
                <th className="py-sm px-sm">Source</th>
                <th className="py-sm px-sm">Destination</th>
                <th className="py-sm px-sm text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/40">
              {currentHost.recentEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-soc-input/60 transition-colors">
                  <td className="py-sm px-sm text-soc-secondary font-medium whitespace-nowrap">
                    {evt.timestamp}
                  </td>
                  <td className="py-sm px-sm text-soc-primary font-semibold whitespace-nowrap">
                    {evt.eventType}
                  </td>
                  <td className="py-sm px-sm text-soc-secondary whitespace-nowrap">
                    <Activity className="w-3 h-3 text-soc-cyan inline mr-1" />
                    {evt.sourceIp}:{evt.sourcePort}
                  </td>
                  <td className="py-sm px-sm text-soc-secondary whitespace-nowrap">
                    {evt.destinationIp}:{evt.destinationPort}
                  </td>
                  <td className="py-sm px-sm text-right whitespace-nowrap">
                    <SeverityBadge severity={evt.severity} riskScore={evt.riskScore} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HostDetails;
