import React, { useEffect } from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { Activity, ShieldAlert, Network, CheckCircle2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { alerts, nodes, fetchDashboardData, isLoading } = useSentinelStore();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Security Command Dashboard</h2>
        <p className="text-sm text-slate-400">Real-time threat monitoring and graph intelligence overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium uppercase">Active Alerts</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">{isLoading ? '...' : alerts.length}</div>
          <p className="text-xs text-rose-400 font-mono">Requires Triage</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium uppercase">Monitored Entities</span>
            <Network className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{isLoading ? '...' : nodes.length}</div>
          <p className="text-xs text-cyan-400 font-mono">Topology Mapped</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium uppercase">Anomalies Mitigated</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">99.4%</div>
          <p className="text-xs text-emerald-400 font-mono">Shield Active</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium uppercase">Graph Engine Status</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">Healthy</div>
          <p className="text-xs text-slate-400 font-mono">0.4ms Latency</p>
        </div>
      </div>
    </div>
  );
};
