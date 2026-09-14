import React, { useState, useMemo } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { EventFilterState, SecurityEventData } from '../../types/events';
import { EventFilters } from './EventFilters';
import { EventTable } from './EventTable';
import { EventDetails } from './EventDetails';

export const Events: React.FC = () => {
  const securityEvents = useDashboardStore((state) => state.securityEvents);

  const [filters, setFilters] = useState<EventFilterState>({
    searchQuery: '',
    severity: 'ALL',
    eventType: 'ALL',
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEventData | null>(null);
  const pageSize = 8;

  // Filter events based on search query, severity, and event type
  const filteredEvents = useMemo(() => {
    return securityEvents.filter((evt) => {
      // Search query match (Source IP, Destination IP, Event Type)
      const q = filters.searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        evt.sourceIp.toLowerCase().includes(q) ||
        evt.destinationIp.toLowerCase().includes(q) ||
        evt.eventType.toLowerCase().includes(q) ||
        evt.id.toLowerCase().includes(q);

      // Severity match
      const matchesSeverity =
        filters.severity === 'ALL' || evt.severity.toUpperCase() === filters.severity.toUpperCase();

      // Event Type match
      const matchesType =
        filters.eventType === 'ALL' || evt.eventType.toUpperCase() === filters.eventType.toUpperCase();

      return matchesSearch && matchesSeverity && matchesType;
    });
  }, [securityEvents, filters]);

  const handleClearFilters = () => {
    setFilters({
      searchQuery: '',
      severity: 'ALL',
      eventType: 'ALL',
    });
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Timestamp',
      'Source IP',
      'Source Port',
      'Destination IP',
      'Destination Port',
      'Event Type',
      'Severity',
      'Risk Score',
      'Status',
    ];
    const rows = filteredEvents.map((e) => [
      e.id,
      `"${e.timestamp}"`,
      e.sourceIp,
      e.sourcePort,
      e.destinationIp,
      e.destinationPort,
      `"${e.eventType}"`,
      e.severity,
      e.riskScore,
      e.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sentinelgraph_security_events_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-md">
      {/* Search & Filters Bar */}
      <EventFilters
        filters={filters}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        onClearFilters={handleClearFilters}
        onExportCsv={handleExportCsv}
        totalFilteredCount={filteredEvents.length}
      />

      {/* Security Events Table & Pagination */}
      <EventTable
        events={filteredEvents}
        currentPage={currentPage}
        pageSize={pageSize}
        totalEvents={filteredEvents.length}
        onPageChange={(page) => setCurrentPage(page)}
        onSelectEvent={(evt) => setSelectedEvent(evt)}
      />

      {/* Event Details Inspector Modal */}
      <EventDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
};

export default Events;
