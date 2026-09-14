import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Database,
  Gauge,
  Activity,
  ShieldAlert,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { DatasetName, ReplaySpeed } from '../../types/simulation';
import { KpiCard } from '../common/KpiCard';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBar } from '../common/RiskBar';
import { Toast } from '../common/Toast';
import { useDashboardStore } from '../../store/dashboardStore';
import { simulationApi } from '../../utils/api/simulationApi';

export const ReplayControl: React.FC = () => {
  const simulation = useDashboardStore((state) => state.simulation);
  const setSelectedDataset = useDashboardStore((state) => state.setSelectedDataset);
  const setReplaySpeed = useDashboardStore((state) => state.setReplaySpeed);
  const setReplayStatus = useDashboardStore((state) => state.setReplayStatus);
  const setFlowsProcessed = useDashboardStore((state) => state.setFlowsProcessed);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const datasets: DatasetName[] = ['CICIDS2017', 'UNSW-NB15', 'Custom Dataset'];
  const speeds: ReplaySpeed[] = ['0.5x', '1x', '2x', '5x'];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Simulate replay progress when running using store state & actions
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (simulation.replayStatus === 'Running') {
      const speedMultiplier = parseFloat(simulation.replaySpeed.replace('x', ''));
      timer = setInterval(() => {
        setFlowsProcessed((prev) => {
          const next = prev + Math.floor(150 * speedMultiplier);
          if (next >= simulation.totalFlows) {
            setReplayStatus('Completed');
            triggerToast('Traffic dataset replay completed successfully!');
            return simulation.totalFlows;
          }
          return next;
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [
    simulation.replayStatus,
    simulation.replaySpeed,
    simulation.totalFlows,
    setFlowsProcessed,
    setReplayStatus,
  ]);

  const handleStartReplay = async () => {
    if (simulation.flowsProcessed >= simulation.totalFlows) {
      setFlowsProcessed(0); // Reset if completed
    }
    setReplayStatus('Running');
    const res = await simulationApi.startSimulation(simulation.selectedDataset, simulation.replaySpeed);
    if (res?.status) {
      setReplayStatus(res.status);
    }
    triggerToast(
      `Started replay of ${simulation.selectedDataset} at ${simulation.replaySpeed} speed.`
    );
  };

  const handleStopReplay = async () => {
    setReplayStatus('Stopped');
    const res = await simulationApi.stopSimulation();
    if (res?.status) {
      setReplayStatus(res.status);
    }
    triggerToast('Replay paused.');
  };

  const progressPercentage = parseFloat(
    ((simulation.flowsProcessed / simulation.totalFlows) * 100).toFixed(1)
  );

  return (
    <div className="space-y-lg relative">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <Toast message={toastMessage} />
        </div>
      )}

      {/* TOP ROW: DATASET SELECTOR & REPLAY CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* DATASET SELECTOR CARD */}
        <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md flex flex-col justify-between">
          <div className="flex items-center space-x-sm border-b border-soc-border pb-sm">
            <div className="p-xs bg-soc-cyan/10 border border-soc-cyan/30 rounded text-soc-cyan">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-soc-primary">Dataset Selector</h3>
              <p className="text-xs text-soc-muted font-mono">Choose traffic PCAP/CSV dataset</p>
            </div>
          </div>

          <div className="space-y-xs">
            <label className="text-xs font-semibold text-soc-secondary font-mono uppercase block">
              Select Dataset
            </label>
            <select
              value={simulation.selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value as DatasetName)}
              className="w-full p-sm bg-soc-input border border-soc-border rounded-lg text-soc-primary text-sm font-mono focus:outline-none focus:border-soc-cyan cursor-pointer"
            >
              {datasets.map((ds) => (
                <option key={ds} value={ds} className="bg-soc-card text-soc-primary">
                  {ds}
                </option>
              ))}
            </select>
          </div>

          <div className="p-sm bg-soc-input/60 border border-soc-border/60 rounded text-xs font-mono text-soc-secondary flex justify-between items-center">
            <span>Active Dataset:</span>
            <span className="font-bold text-soc-cyan">{simulation.selectedDataset}</span>
          </div>
        </div>

        {/* REPLAY CONTROLS CARD */}
        <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md flex flex-col justify-between">
          <div className="flex items-center space-x-sm border-b border-soc-border pb-sm">
            <div className="p-xs bg-soc-cyan/10 border border-soc-cyan/30 rounded text-soc-cyan">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-soc-primary">Replay Speed & Execution</h3>
              <p className="text-xs text-soc-muted font-mono">Control traffic playback velocity</p>
            </div>
          </div>

          {/* Speed Selector Buttons */}
          <div className="space-y-xs">
            <label className="text-xs font-semibold text-soc-secondary font-mono uppercase block">
              Playback Speed
            </label>
            <div className="grid grid-cols-4 gap-xs font-mono text-xs">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setReplaySpeed(s)}
                  className={`py-xs rounded-lg font-bold border transition-colors ${
                    simulation.replaySpeed === s
                      ? 'bg-soc-cyan/20 text-soc-cyan border-soc-cyan/60'
                      : 'bg-soc-input border-soc-border text-soc-secondary hover:text-soc-primary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Start & Stop Action Buttons */}
          <div className="grid grid-cols-2 gap-sm pt-xs">
            <button
              onClick={handleStartReplay}
              disabled={simulation.replayStatus === 'Running'}
              className={`py-sm px-md rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center space-x-xs border ${
                simulation.replayStatus === 'Running'
                  ? 'bg-soc-neon-green/20 border-soc-neon-green text-soc-neon-green shadow-lg'
                  : 'bg-soc-neon-green/10 border-soc-neon-green/40 text-soc-neon-green hover:bg-soc-neon-green/20'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{simulation.replayStatus === 'Running' ? 'Replaying...' : 'Start Replay'}</span>
            </button>

            <button
              onClick={handleStopReplay}
              disabled={simulation.replayStatus === 'Stopped'}
              className={`py-sm px-md rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center space-x-xs border ${
                simulation.replayStatus === 'Stopped'
                  ? 'bg-soc-input border-soc-border text-soc-muted cursor-not-allowed'
                  : 'bg-soc-danger/10 border-soc-danger/40 text-soc-danger hover:bg-soc-danger/20'
              }`}
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Replay</span>
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: REPLAY PROGRESS & STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* REPLAY PROGRESS BAR (2 COLUMNS ON DESKTOP) */}
        <div className="lg:col-span-2 p-md bg-soc-card border border-soc-border rounded-lg space-y-md flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-soc-border pb-sm">
            <h3 className="text-sm font-bold text-soc-primary font-mono">Replay Progress</h3>
            <span className="text-xs font-mono font-bold text-soc-cyan">
              {progressPercentage}% Completed
            </span>
          </div>

          <div className="space-y-sm">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-soc-secondary">Flows Processed:</span>
              <span className="font-bold text-soc-primary">
                {simulation.flowsProcessed.toLocaleString()} / {simulation.totalFlows.toLocaleString()}
              </span>
            </div>

            {/* Custom Progress Bar */}
            <RiskBar
              score={progressPercentage}
              showPercentage={false}
              severity={
                simulation.replayStatus === 'Running'
                  ? 'Low'
                  : simulation.replayStatus === 'Completed'
                  ? 'Low'
                  : 'Medium'
              }
            />
          </div>

          <div className="p-xs bg-soc-input/40 border border-soc-border/40 rounded text-xs font-mono text-soc-muted flex justify-between">
            <span>Buffer Status: Optimal</span>
            <span>Packet Loss: 0.00%</span>
          </div>
        </div>

        {/* REPLAY STATUS SUMMARY CARD */}
        <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-sm font-mono text-xs">
          <div className="flex justify-between items-center border-b border-soc-border pb-xs">
            <span className="font-bold text-soc-primary">Replay Status</span>
            <StatusBadge
              status={simulation.replayStatus === 'Running' ? 'Streaming' : simulation.replayStatus}
              size="sm"
            />
          </div>

          <div className="space-y-xs pt-xs">
            <div className="flex justify-between">
              <span className="text-soc-muted">Dataset:</span>
              <span className="font-semibold text-soc-primary">{simulation.selectedDataset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-soc-muted">Playback Speed:</span>
              <span className="font-semibold text-soc-cyan">{simulation.replaySpeed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-soc-muted">Flows Processed:</span>
              <span className="font-bold text-soc-primary">
                {simulation.flowsProcessed.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-soc-muted">Total Dataset Flows:</span>
              <span className="font-semibold text-soc-secondary">
                {simulation.totalFlows.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: SIMULATION STATISTICS (KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard
          title="Flows Processed"
          value={simulation.flowsProcessed.toLocaleString()}
          icon={Activity}
          subtitle={`out of ${simulation.totalFlows.toLocaleString()}`}
        />
        <KpiCard
          title="Attacks Detected"
          value="186"
          icon={ShieldAlert}
          trend={{ value: '+14%', isPositive: false }}
          subtitle="anomaly signature matches"
        />
        <KpiCard
          title="Current Risk"
          value="High"
          icon={AlertTriangle}
          status="High"
          subtitle="dataset threat score"
        />
        <KpiCard
          title="Replay Duration"
          value={simulation.duration}
          icon={Clock}
          subtitle="elapsed execution time"
        />
      </div>
    </div>
  );
};

export default ReplayControl;
