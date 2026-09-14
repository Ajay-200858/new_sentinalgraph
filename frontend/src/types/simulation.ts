export type ReplayStatus = 'Stopped' | 'Running' | 'Completed';

export type ReplaySpeed = '0.5x' | '1x' | '2x' | '5x';

export type DatasetName = 'CICIDS2017' | 'UNSW-NB15' | 'Custom Dataset';

export type PollingIntervalSec = 1 | 2 | 5 | 10;

export interface ReplayState {
  status: ReplayStatus;
  selectedDataset: DatasetName;
  speed: ReplaySpeed;
  flowsProcessed: number;
  totalFlows: number;
  attacksDetected: number;
  currentRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  duration: string;
}

export interface SimulationSettingsState {
  speed: ReplaySpeed;
  dataset: DatasetName;
  autoStart: boolean;
  pollingInterval: PollingIntervalSec;
  darkTheme: boolean;
}
