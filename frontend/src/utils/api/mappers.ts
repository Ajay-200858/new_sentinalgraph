import {
  DashboardOverviewResponse,
  ForecastResponse,
  HostDetailsResponse,
  MitreResponse,
  NetworkGraphResponse,
  SecurityEventsResponse,
  SimulationStatusResponse,
} from '../../types/api';
import { SecurityEventData } from '../../types/events';
import { NetworkEdgeData, NetworkNodeData } from '../../types/graph';
import { HostDetailsData, MitreTechniqueData } from '../../types/analysis';

/**
 * Safely unwrap raw payload data from FastAPI response objects.
 */
const unwrapData = (raw: any): any => {
  if (!raw) return {};
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    return raw.data;
  }
  return raw;
};

/**
 * Maps and normalizes raw FastAPI Dashboard Overview payloads.
 */
export const mapDashboardOverviewResponse = (raw: any): DashboardOverviewResponse => {
  const payload = unwrapData(raw);
  const rawStats = payload.stats || payload.statistics || {};

  return {
    stats: {
      totalFlowsProcessed:
        rawStats.totalFlowsProcessed ??
        rawStats.total_flows_processed ??
        rawStats.flows_processed ??
        12450,
      attacksDetected:
        rawStats.attacksDetected ??
        rawStats.attacks_detected ??
        rawStats.total_attacks ??
        328,
      hostsIsolated:
        rawStats.hostsIsolated ??
        rawStats.hosts_isolated ??
        rawStats.isolated_hosts ??
        12,
      currentRiskLevel:
        rawStats.currentRiskLevel ??
        rawStats.current_risk_level ??
        rawStats.risk_score ??
        78,
      riskStatus:
        rawStats.riskStatus ||
        rawStats.risk_status ||
        rawStats.severity ||
        'High',
    },
    attackDistribution: (
      payload.attackDistribution ||
      payload.attack_distribution ||
      payload.distribution ||
      []
    ).map((item: any) => ({
      name: item.name || item.type || item.category || 'Unknown',
      value: item.value ?? item.count ?? 0,
      color: item.color || '#00d4ff',
    })),
    riskProjection: (
      payload.riskProjection ||
      payload.risk_projection ||
      payload.projection ||
      []
    ).map((item: any) => ({
      time: item.time || item.timestamp || item.interval || 'Now',
      currentRisk: item.currentRisk ?? item.current_risk ?? item.risk ?? 0,
      projectedRisk: item.projectedRisk ?? item.projected_risk ?? item.projected ?? 0,
    })),
    latestEvents: (
      payload.latestEvents ||
      payload.latest_events ||
      payload.events ||
      []
    ).map(mapSecurityEventItem),
  };
};

/**
 * Maps single Security Event item.
 */
export const mapSecurityEventItem = (item: any): SecurityEventData => ({
  id: item.id || item.event_id || `EVT-${Math.floor(Math.random() * 9000 + 1000)}`,
  timestamp: item.timestamp || item.time || new Date().toISOString(),
  sourcePort: item.sourcePort ?? item.source_port ?? item.src_port ?? 80,
  destinationPort: item.destinationPort ?? item.destination_port ?? item.dst_port ?? 443,
  eventType: item.eventType || item.event_type || item.type || 'Benign',
  severity: item.severity || item.risk || 'Low',
  riskScore: item.riskScore ?? item.risk_score ?? 10,
  sourceIp: item.sourceIp || item.source_ip || item.src_ip || '127.0.0.1',
  destinationIp: item.destinationIp || item.destination_ip || item.dst_ip || '127.0.0.1',
  status: item.status || 'ACTIVE',
  description: item.description || item.details || '',
});

/**
 * Maps Network Topology Graph payload.
 */
export const mapNetworkGraphResponse = (raw: any): NetworkGraphResponse => {
  const payload = unwrapData(raw);

  return {
    nodes: (payload.nodes || []).map((node: any): NetworkNodeData => ({
      id: node.id || node.node_id || node.ip || `node-${Math.random()}`,
      ip: node.ip || node.ip_address || node.label || '10.0.0.1',
      type: node.type || node.category || 'Internal',
      riskLevel: node.riskLevel || node.risk_level || node.severity || 'Low',
      riskScore: node.riskScore ?? node.risk_score ?? 0,
      riskTrend: node.riskTrend || node.risk_trend || 'Stable',
      flowCount: node.flowCount ?? node.flow_count ?? 0,
      attackRate: node.attackRate || node.attack_rate || '0.0%',
      lastSeen: node.lastSeen || node.last_seen || 'Just now',
      partners: Array.isArray(node.partners) ? node.partners : [],
    })),
    edges: (payload.edges || []).map((edge: any): NetworkEdgeData => ({
      id: edge.id || edge.edge_id || `edge-${edge.source}-${edge.target}`,
      source: edge.source || edge.src || edge.source_id,
      target: edge.target || edge.dst || edge.target_id,
      flowCount: edge.flowCount ?? edge.flow_count ?? 1,
      isAttack: Boolean(edge.isAttack ?? edge.is_attack ?? false),
      label: edge.label || '',
    })),
  };
};

/**
 * Maps Forecast / Escalation payload.
 */
export const mapForecastResponse = (raw: any): ForecastResponse => {
  const payload = unwrapData(raw);
  const rawThreat = payload.currentThreat || payload.current_threat || {};
  const rawRec = payload.recommendation || {};

  return {
    currentThreat: {
      threatName: rawThreat.threatName || rawThreat.threat_name || 'Reconnaissance Probe',
      probability: rawThreat.probability ?? 75,
      riskLevel: rawThreat.riskLevel || rawThreat.risk_level || 'High',
      explanation: rawThreat.explanation || rawThreat.description || 'Threat detected on network.',
      affectedHostCount: rawThreat.affectedHostCount ?? rawThreat.affected_host_count ?? 1,
      primaryHost: rawThreat.primaryHost || rawThreat.primary_host || '10.0.4.12',
      detectedTime: rawThreat.detectedTime || rawThreat.detected_time || 'Recent',
    },
    escalations: (payload.escalations || []).map((card: any) => ({
      id: card.id || card.escalation_id || `ESC-${Math.random()}`,
      threatName: card.threatName || card.threat_name || 'Threat Escalation',
      probability: card.probability ?? 50,
      timeline: card.timeline || '+1 minute',
      mitreTactic: card.mitreTactic || card.mitre_tactic || 'Execution',
      mitreId: card.mitreId || card.mitre_id || 'T1059',
      affectedHosts: Array.isArray(card.affectedHosts || card.affected_hosts)
        ? card.affectedHosts || card.affected_hosts
        : [],
      severity: card.severity || card.risk || 'High',
      recommendedAction: card.recommendedAction || card.recommended_action || 'Inspect Host',
    })),
    recommendation: {
      action: rawRec.action || 'Isolate Target Host',
      reason: rawRec.reason || 'High likelihood of attack propagation.',
      relatedThreat: rawRec.relatedThreat || rawRec.related_threat || 'Lateral Movement',
      riskLevel: rawRec.riskLevel || rawRec.risk_level || 'Critical',
      affectedHost: rawRec.affectedHost || rawRec.affected_host || 'Target Node',
      hostIp: rawRec.hostIp || rawRec.host_ip || '10.0.4.12',
      confidenceScore: rawRec.confidenceScore ?? rawRec.confidence_score ?? 90,
    },
  };
};

/**
 * Maps Security Events payload.
 */
export const mapSecurityEventsResponse = (raw: any): SecurityEventsResponse => {
  const payload = unwrapData(raw);
  const eventsList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.events)
    ? payload.events
    : [];

  return {
    events: eventsList.map(mapSecurityEventItem),
    totalCount: payload.totalCount ?? payload.total_count ?? eventsList.length,
    page: payload.page ?? 1,
    pageSize: payload.pageSize ?? payload.page_size ?? eventsList.length,
  };
};

/**
 * Maps Simulation Status payload.
 */
export const mapSimulationStatusResponse = (raw: any): SimulationStatusResponse => {
  const payload = unwrapData(raw);

  return {
    status: payload.status || 'Stopped',
    selectedDataset: payload.selectedDataset || payload.selected_dataset || 'CICIDS2017',
    speed: payload.speed || '1x',
    flowsProcessed: payload.flowsProcessed ?? payload.flows_processed ?? 0,
    totalFlows: payload.totalFlows ?? payload.total_flows ?? 10000,
    attacksDetected: payload.attacksDetected ?? payload.attacks_detected ?? 0,
    currentRisk: payload.currentRisk || payload.current_risk || 'Medium',
    duration: payload.duration || '00:00',
  };
};

/**
 * Maps MITRE ATT&CK response payload.
 */
export const mapMitreResponse = (raw: any): MitreResponse => {
  const payload = unwrapData(raw);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.techniques)
    ? payload.techniques
    : [];

  return {
    techniques: list.map((item: any): MitreTechniqueData => ({
      id: item.id || item.technique_id || 'T1000',
      name: item.name || item.technique_name || 'Technique Name',
      tactic: item.tactic || 'Discovery',
      risk: item.risk || item.severity || 'Medium',
      detectionCount: item.detectionCount ?? item.detection_count ?? 1,
      affectedHosts: Array.isArray(item.affectedHosts || item.affected_hosts)
        ? item.affectedHosts || item.affected_hosts
        : [],
      description: item.description || '',
      recommendedAction: item.recommendedAction || item.recommended_action || '',
    })),
    totalTechniques: payload.totalTechniques ?? payload.total_techniques ?? list.length,
    observedTacticsCount: payload.observedTacticsCount ?? payload.observed_tactics_count ?? 6,
  };
};

/**
 * Maps Host Details payload.
 */
export const mapHostDetailsResponse = (raw: any): HostDetailsResponse => {
  const payload = unwrapData(raw);
  const hostObj = payload.host || payload;

  const mappedHost: HostDetailsData = {
    ipAddress: hostObj.ipAddress || hostObj.ip_address || hostObj.ip || '10.0.0.1',
    hostType: hostObj.hostType || hostObj.host_type || 'Internal',
    riskScore: hostObj.riskScore ?? hostObj.risk_score ?? 50,
    riskLevel: hostObj.riskLevel || hostObj.risk_level || 'Medium',
    status: hostObj.status || 'Active',
    lastSeen: hostObj.lastSeen || hostObj.last_seen || 'Recent',
    riskTrend: hostObj.riskTrend || hostObj.risk_trend || 'Stable',
    attackRate: hostObj.attackRate || hostObj.attack_rate || '0.0%',
    flowCount: hostObj.flowCount ?? hostObj.flow_count ?? 100,
    detectedThreats: (hostObj.detectedThreats || hostObj.detected_threats || []).map(
      (t: any) => ({
        threatName: t.threatName || t.threat_name || 'Threat',
        severity: t.severity || t.risk || 'Medium',
        eventCount: t.eventCount ?? t.event_count ?? 1,
      })
    ),
    partners: (hostObj.partners || []).map((p: any) => ({
      ip: p.ip || p.ip_address || '10.0.0.2',
      riskStatus: p.riskStatus || p.risk_status || 'Low',
      flowCount: p.flowCount ?? p.flow_count ?? 1,
    })),
    recentEvents: (hostObj.recentEvents || hostObj.recent_events || []).map(
      mapSecurityEventItem
    ),
    recommendation: {
      action: hostObj.recommendation?.action || 'Monitor Host Traffic',
      risk: hostObj.recommendation?.risk || 'Medium',
      reason: hostObj.recommendation?.reason || 'Baseline telemetry check.',
    },
  };

  return { host: mappedHost };
};
