import React, { useState, useMemo } from 'react';
import { MOCK_TACTICS, MOCK_MITRE_TECHNIQUES } from '../../mocks/mitreData';
import { MitreTechniqueData } from '../../types/analysis';
import { EventSeverity } from '../../types/events';
import { KpiCard } from '../common/KpiCard';
import { SeverityBadge } from '../common/SeverityBadge';
import { TechniqueDetails } from './TechniqueDetails';
import { Grid, Search, Filter, RotateCcw, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export const MitreMatrix: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTactic, setSelectedTactic] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<EventSeverity | 'ALL'>('ALL');
  const [activeTechnique, setActiveTechnique] = useState<MitreTechniqueData | null>(null);

  // Filter techniques based on search, tactic, and risk
  const filteredTechniques = useMemo(() => {
    return MOCK_MITRE_TECHNIQUES.filter((tech) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q || tech.name.toLowerCase().includes(q) || tech.id.toLowerCase().includes(q);
      const matchesTactic = selectedTactic === 'ALL' || tech.tactic === selectedTactic;
      const matchesRisk = selectedRisk === 'ALL' || tech.risk === selectedRisk;
      return matchesSearch && matchesTactic && matchesRisk;
    });
  }, [searchQuery, selectedTactic, selectedRisk]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTactic('ALL');
    setSelectedRisk('ALL');
  };

  const highRiskCount = useMemo(
    () => MOCK_MITRE_TECHNIQUES.filter((t) => t.risk === 'High' || t.risk === 'Critical').length,
    []
  );

  return (
    <div className="space-y-lg relative">
      {/* 1. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard title="Techniques Detected" value="12" icon={Grid} subtitle="active signatures" />
        <KpiCard title="Tactics Observed" value="6" icon={Activity} subtitle="in current telemetry" />
        <KpiCard
          title="High-Risk Techniques"
          value={highRiskCount}
          icon={AlertTriangle}
          status="High"
          subtitle="requires priority mitigation"
        />
        <KpiCard title="Recent Activity" value="8" icon={ShieldCheck} subtitle="events past 24h" />
      </div>

      {/* 2. FILTERS BAR */}
      <div className="p-md bg-soc-card border border-soc-border rounded-lg space-y-md">
        <div className="flex flex-col md:flex-row gap-md items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-soc-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search technique by name (e.g. Scanning) or ID (e.g. T1046)..."
              className="w-full pl-9 pr-md py-xs text-xs bg-soc-input border border-soc-border rounded-lg text-soc-primary placeholder-soc-muted focus:outline-none focus:border-soc-cyan font-mono"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-xs sm:gap-sm w-full md:w-auto">
            {/* Tactic Dropdown */}
            <div className="flex items-center space-x-xs bg-soc-input border border-soc-border rounded-lg px-2 py-1 text-xs font-mono">
              <Filter className="w-3.5 h-3.5 text-soc-muted" />
              <span className="text-soc-muted text-[10px] uppercase hidden sm:inline">Tactic:</span>
              <select
                value={selectedTactic}
                onChange={(e) => setSelectedTactic(e.target.value)}
                className="bg-transparent text-soc-primary focus:outline-none cursor-pointer border-none py-0"
              >
                <option value="ALL" className="bg-soc-card text-soc-primary">
                  All Tactics
                </option>
                {MOCK_TACTICS.map((t) => (
                  <option key={t} value={t} className="bg-soc-card text-soc-primary">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Risk Dropdown */}
            <div className="flex items-center space-x-xs bg-soc-input border border-soc-border rounded-lg px-2 py-1 text-xs font-mono">
              <span className="text-soc-muted text-[10px] uppercase hidden sm:inline">Risk:</span>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value as EventSeverity | 'ALL')}
                className="bg-transparent text-soc-primary focus:outline-none cursor-pointer border-none py-0"
              >
                <option value="ALL" className="bg-soc-card text-soc-primary">
                  All Risk Levels
                </option>
                <option value="Low" className="bg-soc-card text-soc-primary">
                  Low
                </option>
                <option value="Medium" className="bg-soc-card text-soc-primary">
                  Medium
                </option>
                <option value="High" className="bg-soc-card text-soc-primary">
                  High
                </option>
                <option value="Critical" className="bg-soc-card text-soc-primary">
                  Critical
                </option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleClearFilters}
              className="px-sm py-xs bg-soc-input border border-soc-border text-soc-secondary hover:text-soc-primary hover:border-soc-cyan rounded-lg text-xs font-mono transition-colors flex items-center space-x-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. VISUAL ATT&CK MATRIX CONTAINER (HORIZONTALLY SCROLLABLE) */}
      <div className="bg-soc-card border border-soc-border rounded-lg p-md space-y-md">
        <div className="flex justify-between items-center border-b border-soc-border pb-sm">
          <div>
            <h3 className="text-base font-bold text-soc-primary font-mono">
              MITRE ATT&CK Matrix Grid
            </h3>
            <p className="text-xs text-soc-muted font-mono">
              Click any detected technique card for host details and response recommendations
            </p>
          </div>
          <span className="text-xs font-mono text-soc-cyan bg-soc-input px-sm py-xs border border-soc-border rounded-md">
            Demo Matrix View
          </span>
        </div>

        {/* Scrollable Matrix Columns */}
        <div className="overflow-x-auto pb-sm">
          <div className="inline-flex gap-sm min-w-full">
            {MOCK_TACTICS.map((tactic) => {
              const tacticTechniques = filteredTechniques.filter((t) => t.tactic === tactic);

              return (
                <div
                  key={tactic}
                  className="w-56 shrink-0 bg-soc-input/50 border border-soc-border rounded-lg p-sm space-y-sm flex flex-col justify-start"
                >
                  {/* Tactic Column Header */}
                  <div className="border-b border-soc-border/60 pb-xs">
                    <h4 className="text-xs font-bold text-soc-cyan font-mono truncate uppercase tracking-wider">
                      {tactic}
                    </h4>
                    <span className="text-[10px] text-soc-muted font-mono">
                      {tacticTechniques.length} Detected
                    </span>
                  </div>

                  {/* Technique Cards in Column */}
                  <div className="space-y-xs">
                    {tacticTechniques.length > 0 ? (
                      tacticTechniques.map((tech) => (
                        <div
                          key={tech.id}
                          onClick={() => setActiveTechnique(tech)}
                          className="p-xs bg-soc-card border border-soc-border hover:border-soc-cyan rounded-md cursor-pointer transition-all space-y-xs group"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-soc-cyan font-mono">
                              {tech.id}
                            </span>
                            <SeverityBadge severity={tech.risk} showScore={false} size="sm" />
                          </div>

                          <div className="text-xs font-bold text-soc-primary font-mono group-hover:text-soc-cyan transition-colors leading-tight">
                            {tech.name}
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-soc-muted font-mono pt-[2px]">
                            <span>{tech.detectionCount} Detections</span>
                            <span>{tech.affectedHosts.length} Hosts</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-xs bg-soc-card/40 border border-soc-border/40 rounded text-[11px] text-soc-muted font-mono text-center py-sm">
                        No Technique
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TECHNIQUE DETAILS MODAL */}
      <TechniqueDetails technique={activeTechnique} onClose={() => setActiveTechnique(null)} />
    </div>
  );
};

export default MitreMatrix;
