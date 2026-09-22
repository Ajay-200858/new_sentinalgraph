// forecast.js

let currentRecommendedHost = null;

async function loadForecast() {
    try {
        const data = await window.api.getForecast();
        
        if (!data || !data.currentThreat) {
            const emptyEl = document.getElementById("empty-state");
            const contentEl = document.getElementById("forecast-content");
            if (emptyEl) emptyEl.style.display = "flex";
            if (contentEl) contentEl.style.display = "none";
            return;
        }

        const emptyEl = document.getElementById("empty-state");
        const contentEl = document.getElementById("forecast-content");
        if (emptyEl) emptyEl.style.display = "none";
        if (contentEl) contentEl.style.display = "block";

        const ct = data.currentThreat;
        currentRecommendedHost = ct.primaryHost || ct.affectedHost;

        setEl("threat-type", ct.threatName);
        setEl("threat-prob", `${ct.probability}% (${ct.confidence || ''})`);
        setEl("threat-horizon", ct.forecastHorizon || "5 MIN");
        setEl("threat-host", currentRecommendedHost || "N/A");
        setEl("threat-desc", ct.reason || ct.explanation || "Temporal graph sequence indicates elevated transition probability.");
        setEl("threat-time", ct.timestamp ? `Generated: ${ct.timestamp.replace('T', ' ').substring(0, 19)}` : (ct.detectedTime || 'Recent'));

        // Escalation pathways table
        const tbodyEsc = document.querySelector("#escalation-table tbody");
        if (tbodyEsc) {
            tbodyEsc.innerHTML = "";
            if (data.escalations && data.escalations.length > 0) {
                data.escalations.forEach(esc => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><strong>${esc.threatName}</strong></td>
                        <td>${esc.probability}%</td>
                        <td>${esc.timeline || '5 MIN'}</td>
                        <td>${esc.mitreTactic} (${esc.mitreId || 'T1498'})</td>
                        <td style="font-family: monospace;">${esc.affectedHosts ? esc.affectedHosts.join(", ") : '-'}</td>
                        <td>${esc.recommendedAction || 'Monitor'}</td>
                    `;
                    tbodyEsc.appendChild(tr);
                });
            } else {
                tbodyEsc.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No current escalation pathways.</td></tr>';
            }
        }

        // Recommended Action
        if (data.recommendation) {
            setEl("rec-action", data.recommendation.action);
            setEl("rec-reason", data.recommendation.reason);
            const btnRec = document.getElementById("btn-isolate-rec");
            if (btnRec) {
                btnRec.textContent = `Logically Isolate ${currentRecommendedHost}`;
            }
        }

        // Forecast History Table
        const tbodyHist = document.querySelector("#forecast-history-table tbody");
        if (tbodyHist) {
            tbodyHist.innerHTML = "";
            const historyList = data.history || [];
            if (historyList.length > 0) {
                historyList.forEach(h => {
                    const tr = document.createElement("tr");
                    const riskColor = (h.riskLevel === 'CRITICAL' || h.riskLevel === 'HIGH') ? 'var(--accent-red)' : 'var(--accent-blue)';
                    tr.innerHTML = `
                        <td style="font-size: 0.85rem;">${h.timestamp ? h.timestamp.replace('T', ' ').substring(0, 19) : (h.timeFormatted || '-')}</td>
                        <td><strong>${h.predictedAttack}</strong></td>
                        <td>${h.horizon}</td>
                        <td>${h.probability}%</td>
                        <td>${h.confidence}</td>
                        <td style="font-family: monospace;">${h.affectedHost}</td>
                        <td style="color: ${riskColor}; font-weight: bold;">${h.riskLevel}</td>
                    `;
                    tbodyHist.appendChild(tr);
                });
            } else {
                tbodyHist.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No historical forecasts in database.</td></tr>';
            }
        }
        
    } catch (err) {
        console.error("Failed to load forecast:", err);
    }
}

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

async function handleRecommendedIsolation() {
    if (!currentRecommendedHost) return;

    const confirmed = confirm(`Are you sure you want to logically isolate recommended host: ${currentRecommendedHost}?\n\n(Action: Prototype logical isolation stored in PostgreSQL)`);
    if (!confirmed) return;

    const feedback = document.getElementById("rec-feedback");
    try {
        await window.api.isolateHost(currentRecommendedHost);
        if (feedback) {
            feedback.textContent = `Prototype logical isolation applied: Host ${currentRecommendedHost} has been isolated in SentinelGraph policy.`;
            feedback.style.background = "rgba(16, 185, 129, 0.15)";
            feedback.style.color = "var(--accent-green)";
            feedback.style.display = "block";
            setTimeout(() => { feedback.style.display = "none"; }, 5000);
        }
    } catch (err) {
        if (feedback) {
            feedback.textContent = `Isolation failed: ${err.message}`;
            feedback.style.background = "rgba(239, 68, 68, 0.15)";
            feedback.style.color = "var(--accent-red)";
            feedback.style.display = "block";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    try {
        loadForecast();
        setInterval(loadForecast, 5000);
    } catch (e) {
        console.error("Initialization error in forecast:", e);
    }
});
