import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { useDashboardStore } from '../../store/dashboardStore';
import { NetworkNodeData } from '../../types/graph';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBar } from '../common/RiskBar';
import { Toast } from '../common/Toast';
import {
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Shield,
  Server,
  Activity,
  Lock,
  ExternalLink,
  X,
} from 'lucide-react';

export const NetworkGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const graphNodes = useDashboardStore((state) => state.graphNodes);
  const graphEdges = useDashboardStore((state) => state.graphEdges);

  const [selectedNode, setSelectedNode] = useState<NetworkNodeData | null>(
    graphNodes[0] || null
  );
  const [isolatedNodes, setIsolatedNodes] = useState<Set<string>>(
    new Set(['node-9']) // Node 9 is isolated in mock topology
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!containerRef.current || graphNodes.length === 0) return;

    // Convert graph nodes & edges into Cytoscape elements format
    const elements = [
      ...graphNodes.map((node) => ({
        data: {
          id: node.id,
          label: node.ip,
          type: node.type,
          riskLevel: isolatedNodes.has(node.id) ? 'Isolated' : node.riskLevel,
          riskScore: node.riskScore,
          rawData: node,
        },
      })),
      ...graphEdges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          flowCount: edge.flowCount,
          isAttack: edge.isAttack ? 'true' : 'false',
          label: edge.label || '',
        },
      })),
    ];

    // Initialize Cytoscape Instance
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            color: '#e0e0ff',
            'font-size': '11px',
            'font-family': 'monospace',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': (ele) => {
              const risk = ele.data('riskLevel');
              switch (risk) {
                case 'Critical':
                  return '#ff0000';
                case 'High':
                  return '#ff0055';
                case 'Medium':
                  return '#ffaa00';
                case 'Isolated':
                  return '#6b7280';
                case 'Low':
                default:
                  return '#00ff88';
              }
            },
            shape: (ele) => (ele.data('type') === 'External' ? 'ellipse' : 'round-rectangle'),
            width: 42,
            height: 42,
            'border-width': 2,
            'border-color': '#2d3f5b',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#00d4ff',
            'border-opacity': 1,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#2d3f5b',
            'target-arrow-color': '#2d3f5b',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            opacity: 0.75,
          },
        },
        {
          selector: 'edge[isAttack = "true"]',
          style: {
            width: 3.5,
            'line-color': '#ff0055',
            'target-arrow-color': '#ff0055',
            'line-style': 'dashed',
            opacity: 0.95,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 40,
        componentSpacing: 60,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 90,
      },
    });

    cyRef.current = cy;

    // Node selection tap listener
    cy.on('tap', 'node', (evt) => {
      const nodeEle = evt.target;
      const rawData = nodeEle.data('rawData') as NetworkNodeData;
      setSelectedNode(rawData);
    });

    // Select default node in canvas
    if (graphNodes.length > 0) {
      const defaultNodeEle = cy.$(`#${graphNodes[0].id}`);
      if (defaultNodeEle.length) {
        defaultNodeEle.select();
      }
    }

    return () => {
      cy.destroy();
    };
  }, [graphNodes, graphEdges, isolatedNodes]);

  // Handler for running physics layout re-alignment
  const handleRunLayout = () => {
    if (!cyRef.current) return;
    cyRef.current
      .layout({
        name: 'cose',
        animate: true,
        animationDuration: 500,
        padding: 40,
      })
      .run();
  };

  const handleFit = () => {
    cyRef.current?.fit(undefined, 30);
  };

  const handleZoomIn = () => {
    if (!cyRef.current) return;
    cyRef.current.zoom({
      level: cyRef.current.zoom() * 1.25,
      renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 },
    });
  };

  const handleZoomOut = () => {
    if (!cyRef.current) return;
    cyRef.current.zoom({
      level: cyRef.current.zoom() * 0.8,
      renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 },
    });
  };

  // Mock Host Isolation Toggle
  const handleToggleIsolation = (nodeId: string, ip: string) => {
    setIsolatedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        triggerToast(`Host ${ip} has been restored to active network.`);
      } else {
        next.add(nodeId);
        triggerToast(`Host ${ip} has been isolated from network traffic.`);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-md h-[calc(100vh-10rem)] min-h-[550px] relative">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 animate-bounce">
          <Toast message={toastMessage} />
        </div>
      )}

      {/* GRAPH WORKSPACE CANVAS */}
      <div className="flex-1 bg-soc-card border border-soc-border rounded-lg flex flex-col relative overflow-hidden">
        {/* Graph Control Toolbar */}
        <div className="p-sm bg-soc-input/80 border-b border-soc-border flex items-center justify-between z-10">
          <div className="flex items-center space-x-xs text-xs font-mono text-soc-secondary">
            <span className="font-bold text-soc-primary">Topology View</span>
            <span>•</span>
            <span>{graphNodes.length} Nodes</span>
            <span>•</span>
            <span>{graphEdges.length} Edges</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-xs">
            <button
              onClick={handleRunLayout}
              title="Run Cose Re-layout"
              className="p-xs bg-soc-card border border-soc-border text-soc-secondary hover:text-soc-primary hover:border-soc-cyan rounded transition-colors flex items-center space-x-xs text-xs px-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cose Layout</span>
            </button>
            <button
              onClick={handleFit}
              title="Fit View to Screen"
              className="p-xs bg-soc-card border border-soc-border text-soc-secondary hover:text-soc-primary hover:border-soc-cyan rounded transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-xs bg-soc-card border border-soc-border text-soc-secondary hover:text-soc-primary hover:border-soc-cyan rounded transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-xs bg-soc-card border border-soc-border text-soc-secondary hover:text-soc-primary hover:border-soc-cyan rounded transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cytoscape Container Element */}
        <div ref={containerRef} className="flex-1 w-full h-full bg-[#0a0e27]" />

        {/* Bottom Legend */}
        <div className="p-xs bg-soc-input/60 border-t border-soc-border flex items-center justify-between text-[11px] font-mono px-md">
          <div className="flex items-center space-x-md overflow-x-auto">
            <span className="text-soc-muted">Legend:</span>
            <span className="flex items-center space-x-xs">
              <span className="w-2.5 h-2.5 rounded bg-[#00ff88]" />
              <span className="text-soc-secondary">Low</span>
            </span>
            <span className="flex items-center space-x-xs">
              <span className="w-2.5 h-2.5 rounded bg-[#ffaa00]" />
              <span className="text-soc-secondary">Medium</span>
            </span>
            <span className="flex items-center space-x-xs">
              <span className="w-2.5 h-2.5 rounded bg-[#ff0055]" />
              <span className="text-soc-secondary">High</span>
            </span>
            <span className="flex items-center space-x-xs">
              <span className="w-2.5 h-2.5 rounded bg-[#ff0000]" />
              <span className="text-soc-secondary">Critical</span>
            </span>
            <span className="flex items-center space-x-xs">
              <span className="w-2.5 h-2.5 rounded bg-[#6b7280]" />
              <span className="text-soc-secondary">Isolated</span>
            </span>
          </div>
          <span className="hidden md:inline text-soc-muted">Click node for inspection</span>
        </div>
      </div>

      {/* NODE DETAILS INSPECTOR PANEL */}
      <div className="w-full lg:w-80 bg-soc-card border border-soc-border rounded-lg p-md flex flex-col justify-between space-y-md">
        {selectedNode ? (
          <div className="space-y-md flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-soc-border pb-sm">
              <div>
                <div className="flex items-center space-x-xs">
                  <Server className="w-4 h-4 text-soc-cyan" />
                  <span className="text-xs font-mono font-bold text-soc-muted uppercase">
                    Host Inspector
                  </span>
                </div>
                <h3 className="text-lg font-bold text-soc-primary font-mono mt-xs">
                  {selectedNode.ip}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-soc-muted hover:text-soc-primary p-xs rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Badges */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-soc-secondary">Type & Risk:</span>
              <div className="flex items-center space-x-xs">
                <span className="px-xs py-[2px] bg-soc-input border border-soc-border rounded text-soc-secondary">
                  {selectedNode.type}
                </span>
                <StatusBadge
                  status={
                    isolatedNodes.has(selectedNode.id) ? 'Isolated' : selectedNode.riskLevel
                  }
                  size="sm"
                />
              </div>
            </div>

            {/* Risk Score Progress Bar */}
            <div className="space-y-xs pt-xs">
              <RiskBar
                score={isolatedNodes.has(selectedNode.id) ? 0 : selectedNode.riskScore}
                label="Host Vulnerability Score"
                severity={
                  isolatedNodes.has(selectedNode.id) ? 'Low' : selectedNode.riskLevel
                }
              />
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 gap-xs pt-xs font-mono text-xs">
              <div className="p-xs bg-soc-input border border-soc-border rounded">
                <span className="text-[10px] text-soc-muted uppercase block">Risk Trend</span>
                <span className="font-bold text-soc-primary">{selectedNode.riskTrend}</span>
              </div>
              <div className="p-xs bg-soc-input border border-soc-border rounded">
                <span className="text-[10px] text-soc-muted uppercase block">Attack Rate</span>
                <span className="font-bold text-soc-primary">{selectedNode.attackRate}</span>
              </div>
              <div className="p-xs bg-soc-input border border-soc-border rounded">
                <span className="text-[10px] text-soc-muted uppercase block">Flow Count</span>
                <span className="font-bold text-soc-primary">
                  {selectedNode.flowCount.toLocaleString()}
                </span>
              </div>
              <div className="p-xs bg-soc-input border border-soc-border rounded">
                <span className="text-[10px] text-soc-muted uppercase block">Last Seen</span>
                <span className="font-bold text-soc-primary">{selectedNode.lastSeen}</span>
              </div>
            </div>

            {/* Communication Partners List */}
            <div className="space-y-xs pt-xs">
              <span className="text-xs font-mono font-semibold text-soc-secondary block">
                Active Communication Partners ({selectedNode.partners.length})
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedNode.partners.length > 0 ? (
                  selectedNode.partners.map((partnerIp) => (
                    <div
                      key={partnerIp}
                      className="p-xs bg-soc-input border border-soc-border rounded text-xs font-mono text-soc-primary flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-xs">
                        <Activity className="w-3 h-3 text-soc-cyan" />
                        <span>{partnerIp}</span>
                      </div>
                      <span className="text-[10px] text-soc-muted">Active Edge</span>
                    </div>
                  ))
                ) : (
                  <div className="p-xs bg-soc-input border border-soc-border rounded text-xs font-mono text-soc-muted">
                    No active flow connections (Isolated)
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-md space-y-xs">
              <button
                onClick={() => handleToggleIsolation(selectedNode.id, selectedNode.ip)}
                className={`w-full py-sm px-md rounded-md font-mono text-xs font-bold transition-colors flex items-center justify-center space-x-xs border ${
                  isolatedNodes.has(selectedNode.id)
                    ? 'bg-soc-neon-green/10 border-soc-neon-green/40 text-soc-neon-green hover:bg-soc-neon-green/20'
                    : 'bg-soc-danger/10 border-soc-danger/40 text-soc-danger hover:bg-soc-danger/20'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isolatedNodes.has(selectedNode.id) ? 'Restore Host Access' : 'Isolate Host Node'}
                </span>
              </button>

              <button
                onClick={() =>
                  triggerToast(`Deep telemetry drawer opened for node ${selectedNode.ip}`)
                }
                className="w-full py-sm px-md bg-soc-input border border-soc-border text-soc-primary hover:border-soc-cyan rounded-md font-mono text-xs font-bold transition-colors flex items-center justify-center space-x-xs"
              >
                <ExternalLink className="w-4 h-4 text-soc-cyan" />
                <span>View Extended Details</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-md text-soc-muted space-y-xs font-mono">
            <Shield className="w-8 h-8 text-soc-border" />
            <p className="text-xs">Select any network node on the Cytoscape canvas to inspect details.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkGraph;
