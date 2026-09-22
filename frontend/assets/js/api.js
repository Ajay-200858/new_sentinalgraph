// api.js

async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        
        // Setup headers, include token if stored
        const headers = {
            ...options.headers
        };
        
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        
        const token = localStorage.getItem("sg_token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const fetchOptions = {
            ...options,
            headers
        };

        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            let errMsg = `HTTP Error ${response.status}`;
            try {
                const errData = await response.json();
                if (errData.detail) errMsg = errData.detail;
            } catch (e) {}
            throw new Error(errMsg);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
}

// -----------------------------------------------------
// Endpoints
// -----------------------------------------------------

async function getHealth() { return await apiRequest("/health"); }
async function getSystemStatus() { return await apiRequest("/api/v1/system-status"); }

async function login(username, password) {
    return await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
    });
}
async function register(username, password) {
    return await apiRequest("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password })
    });
}
async function logout() {
    return await apiRequest("/api/v1/auth/logout", { method: "POST" });
}

async function getSummary() { return await apiRequest("/api/v1/summary"); }
async function getGraph() { return await apiRequest("/api/dashboard/graph"); }
async function getSecurityEvents() { return await apiRequest("/api/v1/security-events"); }
async function getForecast() { return await apiRequest("/api/v1/forecast"); }
async function getHosts() { return await apiRequest("/api/v1/hosts"); }
async function getMitre() { return await apiRequest("/api/v1/mitre"); }
async function getNotifications() { return await apiRequest("/api/v1/notifications"); }
async function getReplayStatus() { return await apiRequest("/api/v1/replay/status"); }

async function startReplay(dataset, speed) {
    return await apiRequest("/api/v1/replay/start", {
        method: "POST",
        body: JSON.stringify({ dataset, speed })
    });
}

async function stopReplay() {
    return await apiRequest("/api/v1/replay/stop", { method: "POST" });
}

async function testCaspian() {
    return await apiRequest("/api/v1/caspian/test", { method: "POST" });
}

async function uploadCsv(file) {
    const formData = new FormData();
    formData.append("file", file);
    
    // apiRequest handles FormData cleanly without setting Content-Type to JSON
    return await apiRequest("/api/v1/upload", {
        method: "POST",
        body: formData
    });
}

async function getPredictions(limit = 20) {
    return await apiRequest(`/api/v1/predictions?limit=${limit}`);
}

async function getReplayDatasets() {
    return await apiRequest("/api/v1/replay/datasets");
}

async function isolateHost(ip) {
    return await apiRequest(`/api/v1/hosts/${encodeURIComponent(ip)}/isolate`, { method: "POST" });
}

async function restoreHost(ip) {
    return await apiRequest(`/api/v1/hosts/${encodeURIComponent(ip)}/restore`, { method: "POST" });
}

async function getCaspianStatus() {
    return await apiRequest("/api/v1/caspian/status");
}

// Expose to window
window.api = {
    getHealth, getSystemStatus, login, register, logout,
    getSummary, getGraph, getSecurityEvents, getForecast,
    getHosts, getMitre, getNotifications, getReplayStatus,
    getPredictions, getReplayDatasets, isolateHost, restoreHost,
    startReplay, stopReplay, testCaspian, getCaspianStatus, uploadCsv
};

