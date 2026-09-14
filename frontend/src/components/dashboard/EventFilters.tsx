import React from 'react';
import { Search, Filter, RotateCcw, Download } from 'lucide-react';
import { EventFilterState, EventSeverity } from '../../types/events';

interface EventFiltersProps {
  filters: EventFilterState;
  onFilterChange: (newFilters: EventFilterState) => void;
  onClearFilters: () => void;
  onExportCsv: () => void;
  totalFilteredCount: number;
}

export const EventFilters: React.FC<EventFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  onExportCsv,
  totalFilteredCount,
}) => {
  const severities: (EventSeverity | 'ALL')[] = ['ALL', 'Low', 'Medium', 'High', 'Critical'];
  const eventTypes: string[] = ['ALL', 'DoS', 'DDoS', 'PortScan', 'Benign', 'Data Exfiltration', 'Anomalous Auth'];

  return (
    <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
      <div className="flex flex-col md:flex-row gap-md md:items-center justify-between">
        {/* Left: Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-soc-muted" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Filter by Source IP, Destination IP, or Event Type..."
            className="w-full pl-9 pr-md py-xs text-xs bg-soc-input border border-soc-border rounded-lg text-soc-primary placeholder-soc-muted focus:outline-none focus:border-soc-cyan transition-colors"
          />
        </div>

        {/* Right: Dropdowns & Action Buttons */}
        <div className="flex flex-wrap items-center gap-xs sm:gap-sm">
          {/* Severity Dropdown */}
          <div className="flex items-center space-x-xs bg-soc-input border border-soc-border rounded-lg px-2 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-soc-muted" />
            <span className="text-soc-muted text-[10px] uppercase hidden sm:inline">Severity:</span>
            <select
              value={filters.severity}
              onChange={(e) =>
                onFilterChange({ ...filters, severity: e.target.value as EventSeverity | 'ALL' })
              }
              className="bg-transparent text-soc-primary focus:outline-none cursor-pointer border-none py-0"
            >
              {severities.map((sev) => (
                <option key={sev} value={sev} className="bg-soc-card text-soc-primary">
                  {sev === 'ALL' ? 'All Severities' : sev}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Dropdown */}
          <div className="flex items-center space-x-xs bg-soc-input border border-soc-border rounded-lg px-2 py-1 text-xs">
            <span className="text-soc-muted text-[10px] uppercase hidden sm:inline">Type:</span>
            <select
              value={filters.eventType}
              onChange={(e) => onFilterChange({ ...filters, eventType: e.target.value })}
              className="bg-transparent text-soc-primary focus:outline-none cursor-pointer border-none py-0"
            >
              {eventTypes.map((type) => (
                <option key={type} value={type} className="bg-soc-card text-soc-primary">
                  {type === 'ALL' ? 'All Types' : type}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          <button
            onClick={onClearFilters}
            title="Reset Search and Filters"
            className="px-sm py-xs bg-soc-input border border-soc-border text-soc-secondary hover:text-soc-primary hover:border-soc-cyan rounded-lg text-xs font-mono transition-colors flex items-center space-x-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={onExportCsv}
            className="px-sm py-xs bg-soc-cyan/10 border border-soc-cyan/40 text-soc-cyan hover:bg-soc-cyan/20 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center space-x-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Status Bar */}
      <div className="flex justify-between items-center text-[11px] font-mono text-soc-muted pt-xs border-t border-soc-border/40">
        <span>Showing {totalFilteredCount} Security Events</span>
        {(filters.searchQuery || filters.severity !== 'ALL' || filters.eventType !== 'ALL') && (
          <span className="text-soc-warning">Active Filter Applied</span>
        )}
      </div>
    </div>
  );
};
