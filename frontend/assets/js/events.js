// events.js - SentinelGraph Security Events

let allEvents = [];
let currentFilter = 'All';
let searchQuery = '';

async function loadEvents() {
    try {
        allEvents = await window.api.getSecurityEvents(200) || [];
        renderFilterBar();
        renderTable();
    } catch (err) {
        console.error("Failed to load events", err);
    }
}

function handleSearch(val) {
    searchQuery = (val || '').toLowerCase().trim();
    renderTable();
}

function renderFilterBar() {
    const filters = ['All', 'High Risk'];
    
    // Dynamically extract other types
    const types = new Set(allEvents.map(e => e.attack_type).filter(Boolean));
    ['BENIGN', 'DoS', 'DDoS', 'PortScan', 'Infiltration'].forEach(t => types.add(t));
    
    types.forEach(t => {
        if (!filters.includes(t)) filters.push(t);
    });

    const bar = document.getElementById('filter-bar');
    if (!bar) return;
    bar.innerHTML = '';
    
    filters.forEach(f => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${f === currentFilter ? 'active' : ''}`;
        btn.textContent = f;
        btn.onclick = () => {
            currentFilter = f;
            renderFilterBar();
            renderTable();
        };
        bar.appendChild(btn);
    });
}

function renderTable() {
    const tbody = document.querySelector('#events-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let filtered = allEvents;
    if (currentFilter === 'High Risk') {
        filtered = allEvents.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL' || (e.risk_score && e.risk_score >= 60));
    } else if (currentFilter !== 'All') {
        filtered = allEvents.filter(e => e.attack_type && e.attack_type.toLowerCase() === currentFilter.toLowerCase());
    }

    if (searchQuery) {
        filtered = filtered.filter(e => {
            const src = (e.source_ip || '').toLowerCase();
            const dst = (e.destination_ip || '').toLowerCase();
            const atk = (e.attack_type || '').toLowerCase();
            const tactic = (e.mitre_tactic || '').toLowerCase();
            const tech = (e.mitre_technique || '').toLowerCase();
            const sev = (e.severity || '').toLowerCase();
            return src.includes(searchQuery) || dst.includes(searchQuery) || atk.includes(searchQuery) || tactic.includes(searchQuery) || tech.includes(searchQuery) || sev.includes(searchQuery);
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No events match the selected filter or search.</td></tr>';
        return;
    }

    filtered.forEach(e => {
        const tr = document.createElement('tr');
        
        const atkType = e.attack_type || 'BENIGN';
        const badgeClass = atkType.toLowerCase() === 'benign' ? 'badge-benign' : `badge-${atkType.toLowerCase()}`;
        
        const sevClass = (e.severity || 'LOW').toUpperCase();
        let sevBadge = 'badge-benign';
        if (sevClass === 'CRITICAL' || sevClass === 'HIGH') sevBadge = 'badge-ddos';
        else if (sevClass === 'MEDIUM') sevBadge = 'badge-portscan';
        
        tr.innerHTML = `
            <td style="white-space: nowrap;">${e.timestamp ? e.timestamp.replace('T', ' ').substring(0, 19) : '-'}</td>
            <td><span class="badge ${badgeClass}">${atkType}</span></td>
            <td><span class="badge ${sevBadge}">${e.severity || 'LOW'}</span></td>
            <td style="font-family: monospace;">${e.source_ip || '-'}</td>
            <td style="font-family: monospace;">${e.destination_ip || '-'}</td>
            <td>${e.mitre_tactic || '<span class="text-muted">Technique not mapped</span>'}</td>
            <td>${e.mitre_technique || '<span class="text-muted">Technique not mapped</span>'}</td>
            <td><strong style="color: ${(e.risk_score || 0) >= 60 ? 'var(--accent-red)' : 'inherit'};">${e.risk_score != null ? Math.round(e.risk_score) : 0}</strong></td>
            <td>${e.status || 'NEW'}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    try {
        loadEvents();
        setInterval(loadEvents, 5000);
    } catch (e) {
        console.error("Error initializing events page:", e);
    }
});
