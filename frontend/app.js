const API_BASE = 'http://localhost:8000/api/v1';

// --- AUTH GUARD ---
const path = window.location.pathname;
const isPublicPage = path === '/' || path === '/index.html' || path === '/login.html';

if (!isPublicPage) {
    if (!sessionStorage.getItem('sentinelgraph_authenticated')) {
        window.location.href = '/login.html';
    }
}

// --- CANVAS BACKGROUND ---
function initCanvas() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Node {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.radius = Math.random() * 2 + 1.5;
            this.baseAlpha = Math.random() * 0.5 + 0.1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 240, 255, ${this.baseAlpha})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < 60; i++) {
        particles.push(new Node());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 180) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    // Connection fades based on distance
                    const alpha = 0.2 * (1 - dist / 180);
                    ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
}

// --- SIDEBAR ACTIVE STATE ---
function setupSidebar() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && path.includes(href)) {
            item.classList.add('active');
        }
    });
}

// --- UTILS ---
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --- SYSTEM HEALTH ---
async function checkHealth() {
    const statusApi = document.getElementById('statusApi');
    const statusDb = document.getElementById('statusDb');
    const statusModel = document.getElementById('statusModel');
    const statusNotifications = document.getElementById('statusNotifications');
    
    // Only fetch if elements exist on page
    if (!statusApi && !statusNotifications) return;

    try {
        const res = await fetch('http://localhost:8000/health');
        const data = await res.json();
        
        const updateStatus = (id, text, isOnline) => {
            const els = document.querySelectorAll(`[id="${id}"]`);
            els.forEach(el => {
                el.textContent = text;
                const dot = el.previousElementSibling;
                if (dot) dot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
            });
        };

        updateStatus('statusApi', 'ONLINE', data.status === 'ok');
        updateStatus('statusDb', data.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED', data.database === 'connected');
        updateStatus('statusModel', data.models === 'loaded' ? 'ACTIVE' : 'NOT AVAILABLE', data.models === 'loaded');

        const isNotifReady = data.caspian === 'READY';
        updateStatus('statusNotifications', isNotifReady ? 'ENABLED' : (data.caspian || 'DISABLED'), isNotifReady);

    } catch (e) {
        if(statusApi) statusApi.textContent = 'OFFLINE';
        if(statusDb) statusDb.textContent = 'UNKNOWN';
        if(statusModel) statusModel.textContent = 'UNKNOWN';
        if(statusNotifications) statusNotifications.textContent = 'OFFLINE';
    }
}

// --- DASHBOARD DATA ---
async function loadDashboardSummary() {
    const flowsEl = document.getElementById('valFlows');
    if (!flowsEl) return;

    try {
        const res = await fetch(`${API_BASE}/summary`);
        const data = await res.json();

        animateValue('valFlows', 0, data.total_flows, 1000);
        animateValue('valAttacks', 0, data.attacks_detected, 1000);
        animateValue('valHighRisk', 0, data.high_risk_events, 1000);
        animateValue('valRisk', 0, data.current_risk, 1000);

        // Render Charts if exist
        renderAttackDistChart(data.attack_distribution);
        renderRiskTimeline(data.current_risk, data.forecast_projection);
    } catch(e) { console.error('Dashboard summary error', e); }
}

async function loadRecentPredictions() {
    const tbody = document.getElementById('predictionsTableBody');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/predictions?limit=10`);
        const preds = await res.json();
        
        if (preds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No data available</td></tr>';
            return;
        }

        tbody.innerHTML = preds.map(p => `
            <tr>
                <td>${p.time}</td>
                <td>${p.source}</td>
                <td>${p.destination}</td>
                <td>${p.model}</td>
                <td><span class="${p.attack !== 'Benign' ? 'warning-text' : 'success-text'}">${p.attack}</span></td>
                <td>${p.confidence}</td>
                <td>${p.risk}</td>
                <td><span class="severity-badge severity-${p.severity.toLowerCase()}">${p.severity}</span></td>
            </tr>
        `).join('');
    } catch(e) { console.error('Predictions error', e); }
}

async function loadLatestEvent() {
    const container = document.getElementById('latestEventContainer');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/security-events?limit=1`);
        const events = await res.json();

        if (events.length === 0) {
            container.innerHTML = '<p>No recent security events.</p>';
            return;
        }

        const ev = events[0];
        container.innerHTML = `
            <div class="event-row"><span>Attack Type:</span> <span class="warning-text">${ev.attack_type}</span></div>
            <div class="event-row"><span>Source Model:</span> <span>TGN</span></div>
            <div class="event-row"><span>Risk Score:</span> <span>${ev.risk_score}/100</span></div>
            <div class="event-row"><span>Severity:</span> <span class="severity-badge severity-${ev.severity.toLowerCase()}">${ev.severity}</span></div>
            <div class="event-row"><span>Source:</span> <span>${ev.source_ip}</span></div>
            <div class="event-row"><span>Destination:</span> <span>${ev.destination_ip}</span></div>
            <div class="event-row"><span>MITRE Stage:</span> <span>${ev.mitre_tactic}</span></div>
            <div class="event-row"><span>Timestamp:</span> <span>${new Date(ev.timestamp).toLocaleTimeString()}</span></div>
        `;
    } catch(e) { console.error('Latest event error', e); }
}

// --- SECURITY EVENTS PAGE ---
async function loadAllEvents() {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/security-events?limit=50`);
        const events = await res.json();
        
        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No data available</td></tr>';
            return;
        }

        tbody.innerHTML = events.map(ev => `
            <tr>
                <td>${new Date(ev.timestamp).toLocaleString()}</td>
                <td><span class="warning-text">${ev.attack_type}</span></td>
                <td>${ev.source_ip}</td>
                <td>${ev.destination_ip}</td>
                <td>${ev.risk_score}</td>
                <td><span class="severity-badge severity-${ev.severity.toLowerCase()}">${ev.severity}</span></td>
                <td>${ev.mitre_tactic}</td>
                <td><span class="success-text">LOGGED</span></td>
            </tr>
        `).join('');
    } catch(e) { console.error('Events error', e); }
}

// --- FORECAST PAGE ---
async function loadForecastPage() {
    const valRisk = document.getElementById('valRisk');
    const topThreatVal = document.getElementById('topThreatVal');
    const modelConfidenceVal = document.getElementById('modelConfidenceVal');
    const affectedNodesVal = document.getElementById('affectedNodesVal');
    const chartCtx = document.getElementById('riskTimelineChart');
    
    // Check if we are on the forecast page
    if (!topThreatVal && !chartCtx) return;

    try {
        const [summaryRes, forecastRes, predsRes] = await Promise.all([
            fetch(`${API_BASE}/summary`),
            fetch(`${API_BASE}/forecast`),
            fetch(`${API_BASE}/predictions?limit=50`)
        ]);

        const summaryData = await summaryRes.json();
        const forecastData = await forecastRes.json();
        const predsData = await predsRes.json();

        // 1. Current Risk
        if (valRisk) {
            animateValue('valRisk', 0, summaryData.current_risk || 0, 1000);
        }

        // 2. Affected Nodes
        if (affectedNodesVal) {
            if (predsData && predsData.length > 0) {
                const ips = new Set();
                predsData.forEach(p => {
                    ips.add(p.source);
                    ips.add(p.destination);
                });
                affectedNodesVal.textContent = ips.size;
            } else {
                affectedNodesVal.textContent = "--";
            }
        }

        // 3. Top Projected Threat & Confidence
        if (forecastData && forecastData.length > 0) {
            let topThreat = forecastData[0];
            for (const f of forecastData) {
                if (f.probability > topThreat.probability) {
                    topThreat = f;
                }
            }
            if (topThreatVal) {
                if (topThreat.future_attack_type && topThreat.future_attack_type.toLowerCase() !== 'benign') {
                    topThreatVal.textContent = topThreat.future_attack_type;
                    topThreatVal.className = "danger-text";
                } else {
                    topThreatVal.textContent = "NO ACTIVE THREAT";
                    topThreatVal.className = "success-text";
                }
            }
            if (modelConfidenceVal) {
                if (topThreat.probability !== undefined) {
                    modelConfidenceVal.textContent = (topThreat.probability * 100).toFixed(1) + "%";
                } else {
                    modelConfidenceVal.textContent = "--";
                }
            }
        } else {
            if (topThreatVal) {
                topThreatVal.textContent = "NO ACTIVE THREAT";
                topThreatVal.className = "success-text";
            }
            if (modelConfidenceVal) modelConfidenceVal.textContent = "--";
        }

        // 4. Temporal Risk Projection Chart
        if (chartCtx) {
            const chartData = {
                "next_1_min": summaryData.forecast_projection?.next_1_min || 0,
                "next_3_min": summaryData.forecast_projection?.next_3_min || 0,
                "next_5_min": summaryData.forecast_projection?.next_5_min || 0
            };
            
            // If no data
            if (!summaryData.forecast_projection || summaryData.total_flows === 0) {
                chartData.next_1_min = 0; chartData.next_3_min = 0; chartData.next_5_min = 0;
            }
            
            renderRiskTimeline(summaryData.current_risk || 0, chartData);
        }

    } catch(e) {
        console.error('Forecast page error', e);
        if (valRisk) valRisk.textContent = 0;
        if (topThreatVal) {
            topThreatVal.textContent = "NO ACTIVE THREAT";
            topThreatVal.className = "success-text";
        }
        if (modelConfidenceVal) modelConfidenceVal.textContent = "--";
        if (affectedNodesVal) affectedNodesVal.textContent = "--";
        
        if (chartCtx) {
            renderRiskTimeline(0, { "next_1_min": 0, "next_3_min": 0, "next_5_min": 0 });
        }
    }
}

// --- CHARTS ---
let attackChartInst = null;
let riskChartInst = null;

function renderAttackDistChart(data) {
    const ctx = document.getElementById('attackDistChart');
    if (!ctx) return;
    
    if (attackChartInst) attackChartInst.destroy();
    if (!data || Object.keys(data).length === 0) return;

    const labels = Object.keys(data);
    const values = Object.values(data);

    attackChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#00e676', '#ffea00', '#ff1744', '#8a2be2', '#00f0ff'],
                borderColor: '#050b14',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8b9bb4', font: { family: 'JetBrains Mono' } } }
            }
        }
    });
}

function renderRiskTimeline(currentRisk, forecastData) {
    const ctx = document.getElementById('riskTimelineChart');
    if (!ctx) return;

    if (riskChartInst) riskChartInst.destroy();
    
    // Fallback if no forecast
    if (!forecastData || Object.keys(forecastData).length === 0) {
        forecastData = { "next_1_min": 0, "next_3_min": 0, "next_5_min": 0 };
    }

    riskChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Now', '+1 Min', '+3 Min', '+5 Min'],
            datasets: [{
                label: 'Risk Score Projection',
                data: [currentRisk, forecastData.next_1_min, forecastData.next_3_min, forecastData.next_5_min],
                borderColor: '#00f0ff',
                backgroundColor: 'rgba(0, 240, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b9bb4' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b9bb4' } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// --- FILE UPLOAD (ANALYZE PAGE) ---
function setupUpload() {
    const fileInput = document.getElementById('csvUpload');
    const uploadBtn = document.getElementById('selectCsvBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!fileInput) return;

    let selectedFile = null;

    uploadBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            uploadBtn.textContent = selectedFile.name;
            uploadBtn.classList.add('active');
            analyzeBtn.disabled = false;
        }
    });

    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        analyzeBtn.disabled = true;
        const stagesContainer = document.getElementById('stagesContainer');
        const stages = document.querySelectorAll('.stage-item');
        const resultsArea = document.getElementById('resultsArea');
        
        stagesContainer.classList.remove('hidden');
        resultsArea.classList.add('hidden');

        // Animation logic
        let currentStage = 0;
        const stageInterval = setInterval(() => {
            if (currentStage < stages.length) {
                stages[currentStage].classList.add('active');
                if (currentStage > 0) {
                    stages[currentStage-1].classList.remove('active');
                    stages[currentStage-1].classList.add('done');
                }
                currentStage++;
            }
        }, 800);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            
            clearInterval(stageInterval);
            stages.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
            
            setTimeout(() => {
                document.getElementById('resFlows').textContent = data.flows_processed || 0;
                document.getElementById('resAttacks').textContent = data.attacks_detected || 0;
                document.getElementById('resHighRisk').textContent = data.high_risk_events || 0;
                document.getElementById('resRisk').textContent = data.current_risk || 0;

                const banner = document.getElementById('alertNotificationBanner');
                if (banner) {
                    if (data.attacks_detected > 0) {
                        const title = document.getElementById('alertBannerTitle');
                        const subtitle = document.getElementById('alertBannerSubtitle');
                        if (title) title.textContent = 'THREAT DETECTED & ALERT AUTOMATICALLY DISPATCHED';
                        if (subtitle) {
                            subtitle.textContent = data.alert_details || 
                                `Live alert sent to Discord & Telegram: ${data.attacks_detected} threat event(s) detected`;
                        }
                        banner.classList.remove('hidden');
                    } else {
                        banner.classList.add('hidden');
                    }
                }

                resultsArea.classList.remove('hidden');
            }, 1000);

        } catch (e) {
            clearInterval(stageInterval);
            alert("Analysis failed. See console.");
            analyzeBtn.disabled = false;
        }
    });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    setupSidebar();
    
    // Auth Logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            if (u === 'admin' && p === 'sentinel') {
                sessionStorage.setItem('sentinelgraph_authenticated', 'true');
                window.location.href = 'dashboard.html';
            } else {
                alert("Invalid demo credentials.");
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('sentinelgraph_authenticated');
            window.location.href = 'login.html';
        });
    }

    const btnTestAlert = document.getElementById('btnTestAlert');
    if (btnTestAlert) {
        btnTestAlert.addEventListener('click', async () => {
            const resultEl = document.getElementById('testAlertResult');
            btnTestAlert.disabled = true;
            btnTestAlert.textContent = 'SENDING...';
            if (resultEl) {
                resultEl.style.color = 'var(--text-muted)';
                resultEl.textContent = 'Broadcasting to Discord & Telegram...';
            }
            try {
                const res = await fetch('http://localhost:8000/api/v1/caspian/test', { method: 'POST' });
                const data = await res.json();
                if (data.sent) {
                    btnTestAlert.textContent = 'SENT ✓';
                    if (resultEl) {
                        resultEl.style.color = '#00ff88';
                        resultEl.textContent = '✓ Test alert sent to Discord & Telegram';
                    }
                } else {
                    btnTestAlert.textContent = 'FAILED';
                    if (resultEl) {
                        resultEl.style.color = '#ff3366';
                        resultEl.textContent = `✗ ${data.detail || 'Failed to send'}`;
                    }
                }
            } catch (err) {
                btnTestAlert.textContent = 'ERROR';
                if (resultEl) {
                    resultEl.style.color = '#ff3366';
                    resultEl.textContent = '✗ Connection error';
                }
            } finally {
                setTimeout(() => {
                    btnTestAlert.disabled = false;
                    btnTestAlert.textContent = 'SEND TEST ALERT';
                }, 3000);
            }
        });
    }

    // Run Dashboard initializers
    checkHealth();
    setInterval(checkHealth, 10000);
    loadDashboardSummary();
    loadRecentPredictions();
    loadLatestEvent();
    loadAllEvents();
    loadForecastPage();
    setupUpload();
});
