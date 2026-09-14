import React, { useState } from 'react';
import { Sliders, Activity, Save, Moon, PlayCircle } from 'lucide-react';
import {
  DatasetName,
  PollingIntervalSec,
  ReplaySpeed,
} from '../../types/simulation';
import { Toast } from '../common/Toast';
import { useDashboardStore } from '../../store/dashboardStore';

export const Settings: React.FC = () => {
  const settings = useDashboardStore((state) => state.settings);
  const updateSettings = useDashboardStore((state) => state.updateSettings);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const speeds: ReplaySpeed[] = ['0.5x', '1x', '2x', '5x'];
  const datasets: DatasetName[] = ['CICIDS2017', 'UNSW-NB15', 'Custom Dataset'];
  const pollingIntervals: { label: string; value: PollingIntervalSec }[] = [
    { label: '1 second', value: 1 },
    { label: '2 seconds (Default)', value: 2 },
    { label: '5 seconds', value: 5 },
    { label: '10 seconds', value: 10 },
  ];

  const handleSaveSettings = () => {
    setToastMessage('Settings saved successfully.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-lg max-w-4xl relative">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <Toast message={toastMessage} />
        </div>
      )}

      {/* REPLAY SETTINGS CARD */}
      <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
        <div className="flex items-center space-x-sm border-b border-soc-border pb-sm">
          <div className="p-xs bg-soc-cyan/10 border border-soc-cyan/30 rounded text-soc-cyan">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-soc-primary">Replay Engine Configuration</h3>
            <p className="text-xs text-soc-muted font-mono">
              Set default traffic simulation parameters
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md font-mono text-xs">
          {/* Default Replay Speed */}
          <div className="space-y-xs">
            <label className="text-soc-secondary font-semibold uppercase block">
              Default Replay Speed
            </label>
            <select
              value={settings.speed}
              onChange={(e) =>
                updateSettings({ speed: e.target.value as ReplaySpeed })
              }
              className="w-full p-sm bg-soc-input border border-soc-border rounded-lg text-soc-primary focus:outline-none focus:border-soc-cyan cursor-pointer"
            >
              {speeds.map((s) => (
                <option key={s} value={s} className="bg-soc-card text-soc-primary">
                  {s} Speed
                </option>
              ))}
            </select>
          </div>

          {/* Default Dataset */}
          <div className="space-y-xs">
            <label className="text-soc-secondary font-semibold uppercase block">
              Default Dataset
            </label>
            <select
              value={settings.dataset}
              onChange={(e) =>
                updateSettings({ dataset: e.target.value as DatasetName })
              }
              className="w-full p-sm bg-soc-input border border-soc-border rounded-lg text-soc-primary focus:outline-none focus:border-soc-cyan cursor-pointer"
            >
              {datasets.map((ds) => (
                <option key={ds} value={ds} className="bg-soc-card text-soc-primary">
                  {ds}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Auto Start Toggle */}
        <div className="flex items-center justify-between p-sm bg-soc-input/60 border border-soc-border rounded-lg font-mono text-xs">
          <div className="flex items-center space-x-xs">
            <PlayCircle className="w-4 h-4 text-soc-cyan" />
            <div>
              <span className="font-bold text-soc-primary block">Auto Start Replay</span>
              <span className="text-[11px] text-soc-muted">
                Automatically begin playback when dataset is loaded
              </span>
            </div>
          </div>

          <button
            onClick={() => updateSettings({ autoStart: !settings.autoStart })}
            className={`w-12 h-6 rounded-full p-[2px] transition-colors ${
              settings.autoStart ? 'bg-soc-neon-green' : 'bg-soc-border'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                settings.autoStart ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* MONITORING SETTINGS CARD */}
      <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
        <div className="flex items-center space-x-sm border-b border-soc-border pb-sm">
          <div className="p-xs bg-soc-cyan/10 border border-soc-cyan/30 rounded text-soc-cyan">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-soc-primary">Telemetry & UI Settings</h3>
            <p className="text-xs text-soc-muted font-mono">
              Configure telemetry sampling rates and interface theme
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md font-mono text-xs">
          {/* Polling Interval */}
          <div className="space-y-xs">
            <label className="text-soc-secondary font-semibold uppercase block">
              Polling Interval
            </label>
            <select
              value={settings.pollingInterval}
              onChange={(e) =>
                updateSettings({
                  pollingInterval: parseInt(e.target.value) as PollingIntervalSec,
                })
              }
              className="w-full p-sm bg-soc-input border border-soc-border rounded-lg text-soc-primary focus:outline-none focus:border-soc-cyan cursor-pointer"
            >
              {pollingIntervals.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-soc-card text-soc-primary">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle */}
          <div className="space-y-xs">
            <label className="text-soc-secondary font-semibold uppercase block">
              Interface Theme
            </label>
            <div className="p-sm bg-soc-input/60 border border-soc-border rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-xs">
                <Moon className="w-4 h-4 text-soc-cyan" />
                <span className="text-soc-primary font-bold">SOC Dark Theme</span>
              </div>
              <span className="text-[10px] text-soc-neon-green bg-soc-neon-green/10 border border-soc-neon-green/30 px-xs py-[2px] rounded font-bold">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SAVE SETTINGS ACTION BUTTON */}
      <div className="flex justify-end pt-xs">
        <button
          onClick={handleSaveSettings}
          className="px-lg py-sm bg-soc-cyan/10 border border-soc-cyan/40 text-soc-cyan hover:bg-soc-cyan/20 rounded-lg font-mono text-xs font-bold transition-all flex items-center space-x-xs shadow-md"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;
