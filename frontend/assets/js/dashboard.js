// dashboard.js

let attackChartInstance = null;
let riskChartInstance = null;

async function fetchDashboardData() {
    try {
        let summary;
        try {
            summary = await window.api.getSummary();
        } catch (sumErr) {
            console.error("Failed to fetch summary:", sumErr);
            return;
        }

        let predictions = [];
        try {
            predictions = await window.api.getPredictions(20);
        } catch (predErr) {
            console.warn("Could not fetch predictions:", predErr);
        }

        if (!summary || summary.total_flows === 0) {
            const emptyEl = document.getElementById("empty-state");
            const dashEl = document.getElementById("dashboard-content");
            if (emptyEl) emptyEl.style.display = "flex";
            if (dashEl) dashEl.style.display = "none";
            return;
        }

        const emptyEl = document.getElementById("empty-state");
        const dashEl = document.getElementById("dashboard-content");
        if (emptyEl) emptyEl.style.display = "none";
        if (dashEl) dashEl.style.display = "block";

        // Update KPIs with real database values
        setElText("kpi-total-flows", (summary.total_flows || 0).toLocaleString());
        setElText("kpi-predictions", (summary.total_predictions || summary.total_flows || 0).toLocaleString());
        setElText("kpi-attacks", (summary.attacks_detected || 0).toLocaleString());
        setElText("kpi-high-risk", (summary.high_risk_events || 0).toLocaleString());
        setElText("kpi-active-hosts", (summary.active_hosts || 0).toLocaleString());
        setElText("kpi-risk", summary.current_risk !== undefined ? `${summary.current_risk}/100` : "0/100");

        try {
            updateCharts(summary);
        } catch (chartErr) {
            console.error("Error updating charts:", chartErr);
        }

        try {
            updateRecentEvents(predictions);
        } catch (tableErr) {
            console.error("Error updating recent events table:", tableErr);
        }
        
    } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
    }
}

function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function updateCharts(summary) {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js is not loaded yet.");
        return;
    }

    const attackCanvas = document.getElementById('attackChart');
    const riskCanvas = document.getElementById('riskChart');
    
    if (!attackCanvas || !riskCanvas) return;

    // 1. Attack Distribution Doughnut Chart
    const dist = summary.attack_distribution || {};
    const labels = Object.keys(dist);
    const data = Object.values(dist);
    
    const colorMap = {
        'benign': '#10b981',
        'dos': '#f59e0b',
        'ddos': '#ef4444',
        'portscan': '#3b82f6',
        'infiltration': '#eab308'
    };
    
    const colors = labels.map(l => colorMap[l.toLowerCase()] || '#8b5cf6');

    if (attackChartInstance) {
        attackChartInstance.data.labels = labels;
        attackChartInstance.data.datasets[0].data = data;
        attackChartInstance.data.datasets[0].backgroundColor = colors;
        attackChartInstance.update();
    } else {
        const ctx = attackCanvas.getContext('2d');
        attackChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#f0f4f8', boxWidth: 14 }
                    }
                }
            }
        });
    }

    // 2. Risk Projection Line Chart
    const riskLabels = ['Now', '+1m', '+3m', '+5m'];
    const currentRisk = summary.current_risk || 0;
    const proj = summary.forecast_projection || {};
    const riskData = [
        currentRisk,
        proj.next_1_min !== undefined ? proj.next_1_min : currentRisk,
        proj.next_3_min !== undefined ? proj.next_3_min : currentRisk,
        proj.next_5_min !== undefined ? proj.next_5_min : currentRisk
    ];

    if (riskChartInstance) {
        riskChartInstance.data.datasets[0].data = riskData;
        riskChartInstance.update();
    } else {
        const ctx = riskCanvas.getContext('2d');
        riskChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: riskLabels,
                datasets: [{
                    label: 'Predicted Risk Level',
                    data: riskData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#ef4444'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(51, 65, 85, 0.4)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(51, 65, 85, 0.4)' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

function updateRecentEvents(predictions) {
    const tbody = document.querySelector("#recent-events-table tbody");
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!predictions || predictions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No predictions or events recorded yet.</td></tr>';
        return;
    }

    predictions.forEach(p => {
        const tr = document.createElement("tr");
        const attackName = p.attack || 'BENIGN';
        const badgeClass = attackName.toLowerCase() === 'benign' ? 'badge-benign' : `badge-${attackName.toLowerCase()}`;
        
        tr.innerHTML = `
            <td>${p.time || '-'}</td>
            <td style="font-family: monospace;">${p.source || '-'}</td>
            <td style="font-family: monospace;">${p.destination || '-'}</td>
            <td><span class="badge ${badgeClass}">${attackName}</span></td>
            <td>${p.risk !== undefined ? p.risk : 0}</td>
            <td><span style="font-weight: bold; color: ${p.severity === 'CRITICAL' || p.severity === 'HIGH' ? 'var(--accent-red)' : 'var(--text-primary)'}">${p.severity || '-'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Defensive initialization as required by Phase 3
document.addEventListener("DOMContentLoaded", () => {
    try {
        fetchDashboardData();
        setInterval(fetchDashboardData, 3000);
    } catch (error) {
        console.error("Dashboard initialization error:", error);
    }
});
