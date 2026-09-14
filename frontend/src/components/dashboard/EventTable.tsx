import React from 'react';
import { SecurityEventData } from '../../types/events';
import { SeverityBadge } from '../common/SeverityBadge';
import { EmptyState } from '../common/EmptyState';
import { ShieldAlert, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface EventTableProps {
  events: SecurityEventData[];
  currentPage: number;
  pageSize: number;
  totalEvents: number;
  onPageChange: (newPage: number) => void;
  onSelectEvent: (event: SecurityEventData) => void;
}

export const EventTable: React.FC<EventTableProps> = ({
  events,
  currentPage,
  pageSize,
  totalEvents,
  onPageChange,
  onSelectEvent,
}) => {
  const totalPages = Math.ceil(totalEvents / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEvents = events.slice(startIndex, startIndex + pageSize);

  if (totalEvents === 0) {
    return (
      <EmptyState
        title="No Security Events Found"
        message="No telemetry records match your current search query or filter parameters."
        icon={ShieldAlert}
      />
    );
  }

  return (
    <div className="bg-soc-card border border-soc-border rounded-lg flex flex-col justify-between overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-soc-border bg-soc-input/60 text-soc-muted uppercase tracking-wider">
              <th className="py-sm px-md">Time</th>
              <th className="py-sm px-md">Event ID</th>
              <th className="py-sm px-md">Event Type</th>
              <th className="py-sm px-md">Source</th>
              <th className="py-sm px-md">Destination</th>
              <th className="py-sm px-md">Severity / Risk</th>
              <th className="py-sm px-md text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border/40">
            {paginatedEvents.map((event) => (
              <tr key={event.id} className="hover:bg-soc-input/60 transition-colors group">
                <td className="py-sm px-md text-soc-secondary font-medium whitespace-nowrap">
                  {event.timestamp}
                </td>
                <td className="py-sm px-md text-soc-cyan font-bold whitespace-nowrap">
                  {event.id}
                </td>
                <td className="py-sm px-md text-soc-primary font-semibold whitespace-nowrap">
                  {event.eventType}
                </td>
                <td className="py-sm px-md text-soc-secondary whitespace-nowrap">
                  {event.sourceIp}:<span className="text-soc-muted">{event.sourcePort}</span>
                </td>
                <td className="py-sm px-md text-soc-secondary whitespace-nowrap">
                  {event.destinationIp}:<span className="text-soc-muted">{event.destinationPort}</span>
                </td>
                <td className="py-sm px-md whitespace-nowrap">
                  <SeverityBadge severity={event.severity} riskScore={event.riskScore} size="sm" />
                </td>
                <td className="py-sm px-md text-right whitespace-nowrap">
                  <button
                    onClick={() => onSelectEvent(event)}
                    className="px-sm py-xs bg-soc-input border border-soc-border hover:border-soc-cyan text-soc-cyan rounded text-[11px] font-semibold transition-colors inline-flex items-center space-x-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-sm bg-soc-input/60 border-t border-soc-border flex items-center justify-between text-xs font-mono text-soc-secondary">
        <div>
          Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalEvents)} of{' '}
          <span className="font-bold text-soc-primary">{totalEvents}</span> events
        </div>

        <div className="flex items-center space-x-xs">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-xs bg-soc-card border border-soc-border text-soc-primary disabled:text-soc-muted disabled:border-soc-border/40 disabled:cursor-not-allowed rounded hover:border-soc-cyan transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-sm font-semibold text-soc-primary">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-xs bg-soc-card border border-soc-border text-soc-primary disabled:text-soc-muted disabled:border-soc-border/40 disabled:cursor-not-allowed rounded hover:border-soc-cyan transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventTable;
