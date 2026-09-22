// replay.js

let selectedFile = null;
let replayTimer = null;

// Populate available datasets from backend
async function loadDatasetOptions() {
    try {
        const datasets = await window.api.getReplayDatasets();
        if (datasets && datasets.length > 0) {
            const select = document.getElementById('dataset-select');
            select.innerHTML = '';
            datasets.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.name;
                opt.textContent = `${d.name} (${d.source})`;
                if (d.name === 'demo_five_class_sample.csv') {
                    opt.selected = true;
                }
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.warn("Could not load dynamic dataset list:", err);
    }
}

// File selection handler
const csvFileInput = document.getElementById('csvFile');
if (csvFileInput) {
    csvFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
            document.getElementById('file-info').textContent = `${selectedFile.name} (${sizeMb} MB)`;
            document.getElementById('btn-upload').disabled = false;
            document.getElementById('btn-upload-and-replay').disabled = false;
            document.getElementById('upload-status').innerHTML = '';
        }
    });
}

// Drag and drop support
const uploadArea = document.querySelector('.upload-area');
if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--accent-blue)';
        uploadArea.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    });
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.backgroundColor = '';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.backgroundColor = '';
        if (e.dataTransfer.files.length > 0) {
            selectedFile = e.dataTransfer.files[0];
            const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
            document.getElementById('file-info').textContent = `${selectedFile.name} (${sizeMb} MB)`;
            const btnUpload = document.getElementById('btn-upload');
            const btnUploadReplay = document.getElementById('btn-upload-and-replay');
            if (btnUpload) btnUpload.disabled = false;
            if (btnUploadReplay) btnUploadReplay.disabled = false;
            document.getElementById('upload-status').innerHTML = '';
        }
    });
}

// Direct upload and ingest button
const btnUpload = document.getElementById('btn-upload');
if (btnUpload) {
    btnUpload.addEventListener('click', async () => {
        if (!selectedFile) return;
        await executeUpload(false);
    });
}

// Upload & immediately start replay simulation
const btnUploadAndReplay = document.getElementById('btn-upload-and-replay');
if (btnUploadAndReplay) {
    btnUploadAndReplay.addEventListener('click', async () => {
        if (!selectedFile) return;
        const uploadedFilename = await executeUpload(true);
        if (uploadedFilename) {
            await loadDatasetOptions();
            const datasetSelect = document.getElementById('dataset-select');
            datasetSelect.value = `uploads/${uploadedFilename}`;
            const speed = parseFloat(document.getElementById('speed-select').value) || 10.0;
            await triggerReplay(`uploads/${uploadedFilename}`, speed);
        }
    });
}

async function executeUpload(forReplay = false) {
    const btn = document.getElementById('btn-upload');
    const btnReplay = document.getElementById('btn-upload-and-replay');
    const statusDiv = document.getElementById('upload-status');

    btn.disabled = true;
    btnReplay.disabled = true;
    btn.textContent = "Uploading & Processing...";
    statusDiv.innerHTML = '<div style="color: var(--accent-blue);">Uploading file and analyzing with TGN on backend...</div>';

    try {
        const res = await window.api.uploadCsv(selectedFile);
        const fileName = selectedFile.name;

        let detailsHtml = `
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--accent-green); padding: 12px; border-radius: var(--radius-sm); margin-top: 10px; font-size: 0.9rem;">
                <strong style="color: var(--accent-green);">Upload Successful!</strong><br>
                <span>Flows Ingested: ${res.flows_processed.toLocaleString()}</span><br>
                <span>Attacks Detected: ${res.attacks_detected.toLocaleString()}</span><br>
                <span>High-Risk Events: ${res.high_risk_events.toLocaleString()}</span><br>
                <span>Current Risk Level: ${res.current_risk}/100</span><br>
                <span>Caspian Alerts Sent: ${res.alerts_sent || 0}</span>
                ${res.alert_details ? `<br><span style="color: var(--accent-red);">${res.alert_details}</span>` : ''}
            </div>
        `;
        statusDiv.innerHTML = detailsHtml;
        return fileName;

    } catch (err) {
        statusDiv.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); padding: 12px; border-radius: var(--radius-sm); margin-top: 10px; color: var(--accent-red); font-size: 0.9rem;">
                <strong>Upload Failed:</strong> ${err.message}
            </div>
        `;
        return null;
    } finally {
        btn.textContent = "Upload and Ingest";
        btn.disabled = false;
        btnReplay.disabled = false;
    }
}

// Replay Controls
const btnStart = document.getElementById('btn-start-replay');
const btnStop = document.getElementById('btn-stop-replay');

if (btnStart) {
    btnStart.addEventListener('click', async () => {
        const dataset = document.getElementById('dataset-select').value;
        const speed = parseFloat(document.getElementById('speed-select').value) || 10.0;
        await triggerReplay(dataset, speed);
    });
}

async function triggerReplay(dataset, speed) {
    btnStart.disabled = true;
    btnStart.textContent = "Starting Simulation...";
    document.getElementById('replay-error-box').style.display = 'none';

    try {
        await window.api.startReplay(dataset, speed);
        startPolling();
    } catch (err) {
        document.getElementById('replay-error-box').textContent = `Failed to start: ${err.message}`;
        document.getElementById('replay-error-box').style.display = 'block';
        btnStart.disabled = false;
        btnStart.textContent = "Start Replay";
    }
}

if (btnStop) {
    btnStop.addEventListener('click', async () => {
        btnStop.disabled = true;
        try {
            await window.api.stopReplay();
            const s = await window.api.getReplayStatus();
            updateReplayUI(s);
        } catch (err) {
            console.error("Failed to stop replay:", err);
        }
    });
}

function startPolling() {
    btnStart.disabled = true;
    btnStart.textContent = "Replay Running...";
    btnStop.disabled = false;
    btnStop.style.backgroundColor = "var(--accent-red)";
    btnStop.style.color = "white";

    if (replayTimer) clearInterval(replayTimer);
    fetchReplayStatus();
    replayTimer = setInterval(fetchReplayStatus, 800);
}

async function fetchReplayStatus() {
    try {
        const status = await window.api.getReplayStatus();
        updateReplayUI(status);

        const normalizedState = (status.status || status.state || '').toLowerCase();
        if (normalizedState === "completed" || normalizedState === "stopped" || normalizedState === "failed" || normalizedState === "error") {
            clearInterval(replayTimer);
            replayTimer = null;
            btnStart.disabled = false;
            btnStart.textContent = "Start Replay";
            btnStop.disabled = true;
            btnStop.style.backgroundColor = "var(--bg-tertiary)";
            btnStop.style.color = "var(--text-primary)";
        }
    } catch (err) {
        console.error("Polling error:", err);
    }
}

function updateReplayUI(s) {
    if (!s) return;

    const rawStatus = s.status || s.state || 'Ready';
    const badge = document.getElementById('replay-status-badge');
    badge.textContent = rawStatus.toUpperCase();

    const stLower = rawStatus.toLowerCase();
    if (stLower === 'processing' || stLower === 'running') {
        badge.className = "status-badge status-processing";
    } else if (stLower === 'completed') {
        badge.className = "status-badge status-completed";
    } else if (stLower === 'failed' || stLower === 'error') {
        badge.className = "status-badge status-failed";
    } else {
        badge.className = "status-badge status-ready";
    }

    const processed = s.processed_rows !== undefined ? s.processed_rows : (s.flows_processed || 0);
    const total = s.total_rows !== undefined ? s.total_rows : (s.total_flows || 0);
    const pct = s.progress_percent !== undefined ? s.progress_percent : (total > 0 ? ((processed / total) * 100).toFixed(1) : 0);

    document.getElementById('replay-progress-text').textContent = `${processed.toLocaleString()} / ${total.toLocaleString()} rows (${pct}%)`;
    document.getElementById('replay-progress-bar').style.width = `${pct}%`;

    document.getElementById('replay-current-attack').textContent = s.current_attack || 'None';
    document.getElementById('replay-attacks').textContent = (s.attacks_detected || 0).toLocaleString();
    document.getElementById('replay-risk').textContent = `${s.current_risk || 0}/100`;

    const errBox = document.getElementById('replay-error-box');
    if (s.error) {
        errBox.textContent = `Backend Error: ${s.error}`;
        errBox.style.display = 'block';
    } else {
        errBox.style.display = 'none';
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadDatasetOptions();
        const s = await window.api.getReplayStatus();
        updateReplayUI(s);

        const stLower = (s.status || s.state || '').toLowerCase();
        if (stLower === "processing" || stLower === "running") {
            startPolling();
        }
    } catch (e) {
        console.error("Error during replay initialization:", e);
    }
});
