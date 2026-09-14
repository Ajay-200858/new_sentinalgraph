import React from 'react';
import { Events } from '../components/dashboard/Events';

export const EventsPage: React.FC = () => {
  return (
    <div className="space-y-md">
      {/* 1. PAGE HEADER */}
      <div className="flex justify-between items-center border-b border-soc-border pb-sm">
        <div>
          <h2 className="text-xl font-bold text-soc-primary tracking-tight">Security Events</h2>
          <p className="text-xs text-soc-secondary font-mono">
            Monitor and investigate detected network security events.
          </p>
        </div>
      </div>

      {/* Main Events Feed & Controls */}
      <Events />
    </div>
  );
};

export default EventsPage;
