// graph.js
let cy = null;
let currentLimit = 10;
let cachedGraphData = null;
let selectedNodeData = null;
let isRiskyOnly = false;

async function loadGraph(limit = 10) {
    currentLimit = limit;
    isRiskyOnly = false;
    highlightLimitButton(limit);

    try {
        const data = await window.api.getGraph();
        cachedGraphData = data;
        renderCytoscape(data, limit);
    } catch (err) {
        console.error("Failed to load graph:", err);
    }
}

function filterRiskyOnly() {
    isRiskyOnly = true;
    clearActiveButtons();
    if (!cachedGraphData) return;
    renderCytoscape(cachedGraphData, 100, true);
}

function highlightLimitButton(limit) {
    clearActiveButtons();
    const btn = document.getElementById(`btn-top${limit}`);
    if (btn) {
        btn.className = "btn-primary";
    }
}

function clearActiveButtons() {
    ['btn-top10', 'btn-top20', 'btn-top50'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = "btn-secondary";
    });
}

function renderCytoscape(data, limit, riskyOnly = false) {
    if (!data || !data.nodes || data.nodes.length === 0) {
        const emptyEl = document.getElementById("empty-state");
        const graphEl = document.getElementById("graph-container");
        if (emptyEl) emptyEl.style.display = "flex";
        if (graphEl) graphEl.style.display = "none";
        return;
    }

    const emptyEl = document.getElementById("empty-state");
    const graphEl = document.getElementById("graph-container");
    if (emptyEl) emptyEl.style.display = "none";
    if (graphEl) graphEl.style.display = "block";

    let nodesToRender = [...data.nodes];

    if (riskyOnly) {
        nodesToRender = nodesToRender.filter(n => n.attack_count > 0 || n.is_isolated || (n.risk_score && n.risk_score >= 30));
    } else {
        nodesToRender = nodesToRender.slice(0, limit);
    }

    if (nodesToRender.length === 0) {
        nodesToRender = data.nodes.slice(0, 10);
    }

    const nodeIds = new Set(nodesToRender.map(n => n.id));
    const elements = [];

    nodesToRender.forEach(n => {
        let color = "#10b981"; // benign green
        const riskLevel = (n.risk_level || 'Benign').toLowerCase();

        if (n.is_isolated || riskLevel === 'isolated') {
            color = "#8b5cf6"; // purple isolated
        } else if (riskLevel === 'critical' || (n.risk_score && n.risk_score >= 85)) {
            color = "#991b1b"; // dark red critical
        } else if (riskLevel === 'high' || (n.risk_score && n.risk_score >= 60) || n.attack_count > 0) {
            color = "#ef4444"; // red high risk
        } else if (riskLevel === 'suspicious' || (n.risk_score && n.risk_score >= 30)) {
            color = "#f59e0b"; // yellow suspicious
        }

        elements.push({
            data: {
                id: n.id,
                label: n.ip,
                color: color,
                raw: n
            }
        });
    });

    (data.edges || []).forEach(e => {
        if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
            const edgeColor = e.attack_type ? '#ef4444' : '#334155';
            elements.push({
                data: {
                    id: e.source + '-' + e.target,
                    source: e.source,
                    target: e.target,
                    color: edgeColor,
                    attack_type: e.attack_type,
                    protocol: e.protocol,
                    port: e.port
                }
            });
        }
    });

    if (cy) {
        try { cy.destroy(); } catch (e) {}
    }

    const container = document.getElementById('cy');
    if (!container) return;

    cy = cytoscape({
        container: container,
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': 'data(color)',
                    'label': 'data(label)',
                    'color': '#f0f4f8',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'font-size': '11px',
                    'font-family': 'monospace',
                    'width': 36,
                    'height': 36,
                    'border-width': 2,
                    'border-color': '#1e293b'
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 4,
                    'border-color': '#ffffff',
                    'width': 44,
                    'height': 44
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': 'data(color)',
                    'target-arrow-color': 'data(color)',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'arrow-scale': 0.8,
                    'opacity': 0.85
                }
            }
        ],
        layout: {
            name: 'cose',
            animate: true,
            padding: 30,
            nodeRepulsion: 4500,
            idealEdgeLength: 80
        }
    });

    // Node click handler
    cy.on('tap', 'node', function (evt) {
        const node = evt.target;
        showNodeDetails(node.data('raw'));
    });

    // Background click resets details
    cy.on('tap', function (evt) {
        if (evt.target === cy) {
            clearNodeDetails();
        }
    });
}

function showNodeDetails(n) {
    if (!n) return;
    selectedNodeData = n;

    document.getElementById('detail-empty').style.display = 'none';
    document.getElementById('detail-content').style.display = 'block';

    document.getElementById('d-ip').textContent = n.ip || n.id;
    document.getElementById('d-type').textContent = n.type || (n.internal ? 'Internal' : 'External');
    document.getElementById('d-flows').textContent = n.flow_count || 0;
    document.getElementById('d-attacks').textContent = n.attack_count || 0;
    document.getElementById('d-threat').textContent = n.threat_type || 'None';
    document.getElementById('d-risk').textContent = n.risk_level || 'Benign';
    document.getElementById('d-iso').textContent = n.is_isolated ? 'ISOLATED' : 'Active (Normal)';
    document.getElementById('d-iso').style.color = n.is_isolated ? 'var(--accent-purple, #8b5cf6)' : 'var(--accent-green)';
    document.getElementById('d-time').textContent = n.last_seen ? n.last_seen.replace('T', ' ').substring(0, 19) : 'Recent';

    const btnIso = document.getElementById('btn-toggle-isolate');
    if (n.is_isolated) {
        btnIso.textContent = "Restore Host Access";
        btnIso.style.backgroundColor = "var(--accent-green)";
    } else {
        btnIso.textContent = "Isolate Host (Logical)";
        btnIso.style.backgroundColor = "var(--accent-red)";
    }
}

function clearNodeDetails() {
    selectedNodeData = null;
    document.getElementById('detail-empty').style.display = 'block';
    document.getElementById('detail-content').style.display = 'none';
}

async function handleNodeIsolation() {
    if (!selectedNodeData) return;
    const ip = selectedNodeData.ip || selectedNodeData.id;
    const isIso = selectedNodeData.is_isolated;

    const actionText = isIso ? "restore network access for" : "logically isolate";
    const confirmed = confirm(`Are you sure you want to ${actionText} host ${ip}?\n(Action: Prototype logical isolation in SentinelGraph policy)`);
    if (!confirmed) return;

    try {
        if (isIso) {
            await window.api.restoreHost(ip);
            alert(`Prototype logical isolation: Host ${ip} has been restored.`);
        } else {
            await window.api.isolateHost(ip);
            alert(`Prototype logical isolation: Host ${ip} has been logically isolated in PostgreSQL.`);
        }
        await loadGraph(currentLimit);
    } catch (err) {
        alert(`Failed to update isolation status: ${err.message}`);
    }
}

function fitGraph() {
    if (cy) cy.fit(undefined, 30);
}

function resetLayout() {
    if (cy) {
        cy.layout({ name: 'cose', animate: true, nodeRepulsion: 4500, idealEdgeLength: 80 }).run();
    }
}

function refreshGraph() {
    loadGraph(currentLimit);
}

document.addEventListener("DOMContentLoaded", () => {
    try {
        loadGraph(10);
    } catch (err) {
        console.error("Graph initialization error:", err);
    }
});
