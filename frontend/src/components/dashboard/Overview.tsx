import React from 'react';
import {
  Activity,
  ShieldAlert,
  Server,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { KpiCard } from '../common/KpiCard';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBar } from '../common/RiskBar';
import { useDashboardStore } from '../../store/dashboardStore';

// Custom Tooltip for Recharts
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-sm bg-soc-input border border-soc-border rounded-md shadow-xl text-xs font-mono">
        {label && <p className="font-bold text-soc-cyan mb-1">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-sm">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-soc-secondary">{entry.name}:</span>
            <span className="font-bold text-soc-primary">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const Overview: React.FC = () => {
  const stats = useDashboardStore((state) => state.stats);
  const attackDistribution = useDashboardStore((state) => state.attackDistribution);
  const riskProjection = useDashboardStore((state) => state.riskProjection);
  const securityEvents = useDashboardStore((state) => state.securityEvents);

  const totalAttackVolume = attackDistribution.reduce((acc, cur) => acc + cur.value, 0);
  const latestEvents = securityEvents.slice(0, 5);

  return (
    <div className="space-y-lg">
      {/* SECTION 1 — KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard
          title="Total Flows Processed"
          value={stats.totalFlowsProcessed.toLocaleString()}
          icon={Activity}
          subtitle="vs previous window"
          trend={{ value: '+12.4%', isPositive: true }}
        />
        <KpiCard
          title="Attacks Detected"
          value={stats.attacksDetected.toLocaleString()}
          icon={ShieldAlert}
          subtitle="active alert feeds"
          trend={{ value: '+8.2%', isPositive: false }}
        />
        <KpiCard
          title="Hosts Isolated"
          value={stats.hostsIsolated.toLocaleString()}
          icon={Server}
          subtitle="quarantined nodes"
          trend={{ value: '-3.1%', isPositive: true }}
        />
        <KpiCard
          title="Current Risk Level"
          value={`${stats.currentRiskLevel} / 100`}
          icon={AlertTriangle}
          status={stats.riskStatus}
          subtitle="escalation warning"
        />
      </div>

      {/* CHARTS SECTION (2 & 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* SECTION 2 — ATTACK DISTRIBUTION CHART */}
        <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-soc-border/60 pb-sm">
            <div>
              <h3 className="text-sm font-bold text-soc-primary">Attack Vector Distribution</h3>
              <p className="text-xs text-soc-muted font-mono">Telemetry breakdown by threat class</p>
            </div>
            <span className="text-xs font-mono text-soc-cyan bg-soc-input px-sm py-xs border border-soc-border rounded-md">
              {totalAttackVolume.toLocaleString()} Total Events
            </span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attackDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {attackDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#1a1f3a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-xs border-t border-soc-border/60 pt-sm">
            {attackDistribution.map((item) => {
              const percentage = totalAttackVolume > 0 ? ((item.value / totalAttackVolume) * 100).toFixed(1) : '0';
              return (
                <div key={item.name} className="p-xs bg-soc-input border border-soc-border rounded-md">
                  <div className="flex items-center space-x-xs">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] font-semibold text-soc-secondary font-mono">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-xs font-bold text-soc-primary font-mono">{item.value}</span>
                    <span className="text-[10px] text-soc-muted font-mono">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3 — RISK PROJECTION CHART */}
        <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-soc-border/60 pb-sm">
            <div>
              <h3 className="text-sm font-bold text-soc-primary">Predictive Risk Projection</h3>
              <p className="text-xs text-soc-muted font-mono">5-Minute threat propagation timeline</p>
            </div>
            <div className="flex items-center space-x-xs text-xs font-mono text-soc-warning bg-soc-input px-sm py-xs border border-soc-border rounded-md">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Projected +24%</span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskProjection} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3f5b" opacity={0.5} />
                <XAxis
                  dataKey="time"
                  stroke="#a0a8c0"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#2d3f5b' }}
                />
                <YAxis
                  stroke="#a0a8c0"
                  fontSize={11}
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={{ stroke: '#2d3f5b' }}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="currentRisk"
                  name="Current Risk"
                  stroke="#00d4ff"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#00d4ff' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="projectedRisk"
                  name="Projected Risk"
                  stroke="#ff0055"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: '#ff0055' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Level Bar */}
          <div className="border-t border-soc-border/60 pt-sm">
            <RiskBar score={stats.currentRiskLevel} label="Aggregate Risk Score" severity={stats.riskStatus} />
          </div>
        </div>
      </div>

      {/* SECTION 4 — TOP SECURITY EVENTS TABLE */}
      <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
        <div className="flex justify-between items-center border-b border-soc-border/60 pb-sm">
          <div className="flex items-center space-x-sm">
            <ShieldCheck className="w-5 h-5 text-soc-cyan" />
            <div>
              <h3 className="text-sm font-bold text-soc-primary">Latest Security Events</h3>
              <p className="text-xs text-soc-muted font-mono">Real-time priority event stream (Top 5)</p>
            </div>
          </div>
          <span className="text-xs font-mono text-soc-secondary bg-soc-input px-sm py-xs border border-soc-border rounded-md">
            Live Feed
          </span>
        </div>

        {/* Responsive Events Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-soc-border text-soc-muted uppercase tracking-wider">
                <th className="py-sm px-sm">Time</th>
                <th className="py-sm px-sm">Event ID</th>
                <th className="py-sm px-sm">Event Type</th>
                <th className="py-sm px-sm">Source IP</th>
                <th className="py-sm px-sm">Destination</th>
                <th className="py-sm px-sm text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/40">
              {latestEvents.map((event) => (
                <tr
                  key={event.id}
                  className="hover:bg-soc-input/60 transition-colors group"
                >
                  <td className="py-sm px-sm text-soc-secondary font-medium">{event.timestamp}</td>
                  <td className="py-sm px-sm text-soc-cyan font-bold">{event.id}</td>
                  <td className="py-sm px-sm text-soc-primary font-semibold">{event.eventType}</td>
                  <td className="py-sm px-sm text-soc-secondary">{event.sourceIp}</td>
                  <td className="py-sm px-sm text-soc-secondary">{event.destinationIp}</td>
                  <td className="py-sm px-sm text-right">
                    <StatusBadge status={event.severity} size="sm" />
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

export default Overview;
