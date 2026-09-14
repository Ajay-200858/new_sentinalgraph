import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { OverviewPage } from './pages/OverviewPage';
import { NetworkGraphPage } from './pages/NetworkGraphPage';
import { ForecastPage } from './pages/ForecastPage';
import { EventsPage } from './pages/EventsPage';
import { ReplayControlPage } from './pages/ReplayControlPage';
import { SimulationSettingsPage } from './pages/SimulationSettingsPage';
import { MitrePage } from './pages/MitrePage';
import { HostDetailsPage } from './pages/HostDetailsPage';
import './App.css';

export const App: React.FC = () => {
  return (
    <MainLayout>
      <Routes>
        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />

        {/* Dashboard Routes */}
        <Route path="/dashboard/overview" element={<OverviewPage />} />
        <Route path="/dashboard/graph" element={<NetworkGraphPage />} />
        <Route path="/dashboard/forecast" element={<ForecastPage />} />
        <Route path="/dashboard/events" element={<EventsPage />} />

        {/* Simulation Routes */}
        <Route path="/simulation/replay" element={<ReplayControlPage />} />
        <Route path="/simulation/settings" element={<SimulationSettingsPage />} />

        {/* Analysis Routes */}
        <Route path="/analysis/mitre" element={<MitrePage />} />
        <Route path="/analysis/host-details" element={<HostDetailsPage />} />

        {/* System & Additional Routes */}
        <Route
          path="/system-status"
          element={
            <div className="p-md bg-soc-card border border-soc-border rounded-lg">
              <h2 className="text-lg font-bold text-soc-primary">System Status</h2>
              <p className="text-xs text-soc-secondary mt-xs">All SOC microservices operational.</p>
            </div>
          }
        />
        <Route
          path="/caspian-config"
          element={
            <div className="p-md bg-soc-card border border-soc-border rounded-lg">
              <h2 className="text-lg font-bold text-soc-primary">Caspian Config</h2>
              <p className="text-xs text-soc-secondary mt-xs">Engine parameters & thresholds configuration.</p>
            </div>
          }
        />

        {/* Catch-all Fallback Redirect */}
        <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
      </Routes>
    </MainLayout>
  );
};

export default App;
