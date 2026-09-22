// layout.js

const icons = {
    shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`,
    graph: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
    replay: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    forecast: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
    events: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    mitre: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
    hosts: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
    settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    caspian: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    logout: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
};

function renderLayout() {
    const sidebarHtml = `
        <aside class="sidebar">
            <div class="sidebar-header">
                ${icons.shield}
                <h2>SentinelGraph</h2>
            </div>
            <nav class="sidebar-nav">
                <a href="dashboard.html" class="nav-link" id="nav-dashboard">
                    <span style="margin-right: 12px; display: flex;">${icons.dashboard}</span> Overview
                </a>
                <a href="graph.html" class="nav-link" id="nav-graph">
                    <span style="margin-right: 12px; display: flex;">${icons.graph}</span> Network Graph
                </a>
                <a href="replay.html" class="nav-link" id="nav-replay">
                    <span style="margin-right: 12px; display: flex;">${icons.replay}</span> Replay Control
                </a>
                <a href="forecast.html" class="nav-link" id="nav-forecast">
                    <span style="margin-right: 12px; display: flex;">${icons.forecast}</span> Forecast
                </a>
                <a href="events.html" class="nav-link" id="nav-events">
                    <span style="margin-right: 12px; display: flex;">${icons.events}</span> Security Events
                </a>
                <a href="mitre.html" class="nav-link" id="nav-mitre">
                    <span style="margin-right: 12px; display: flex;">${icons.mitre}</span> MITRE ATT&CK
                </a>
                <a href="hosts.html" class="nav-link" id="nav-hosts">
                    <span style="margin-right: 12px; display: flex;">${icons.hosts}</span> Hosts
                </a>
                <a href="settings.html" class="nav-link" id="nav-settings">
                    <span style="margin-right: 12px; display: flex;">${icons.settings}</span> System Status
                </a>
                <a href="caspian.html" class="nav-link" id="nav-caspian">
                    <span style="margin-right: 12px; display: flex;">${icons.caspian}</span> Notifications
                </a>
            </nav>
            <div class="sidebar-footer">
                <button onclick="handleLogout()" class="btn-logout">
                    <span style="margin-right: 8px; display: flex;">${icons.logout}</span> Logout
                </button>
            </div>
        </aside>
    `;

    const topbarHtml = `
        <header class="topbar">
            <div class="topbar-title">
                <h1 id="page-title">Dashboard</h1>
            </div>
            <div class="topbar-status">
                <span class="status-indicator" id="status-backend" title="Backend Connection">Backend: Checking...</span>
                <span class="status-indicator" id="status-db" title="Database Connection">DB: Checking...</span>
                <span class="status-indicator" id="status-replay" title="Replay Engine">Replay: Checking...</span>
                <span class="last-updated" id="last-updated">Last updated: -</span>
                <button class="btn-refresh" onclick="location.reload()">Refresh</button>
            </div>
        </header>
    `;

    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;

    // Wrap the existing body contents in a layout container if not already
    const layoutContainer = document.createElement("div");
    layoutContainer.className = "layout-container";

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "content-wrapper";

    // Insert Sidebar
    layoutContainer.innerHTML = sidebarHtml;
    
    // Insert Topbar into content wrapper
    contentWrapper.innerHTML = topbarHtml;
    
    // Move main-content into content wrapper
    mainContent.parentNode.replaceChild(layoutContainer, mainContent);
    contentWrapper.appendChild(mainContent);
    layoutContainer.appendChild(contentWrapper);

    // Inject global cinematic background for internal pages
    if (!document.querySelector('script[src="assets/js/global-bg.js"]')) {
        const bgScript = document.createElement("script");
        bgScript.src = "assets/js/global-bg.js";
        document.body.appendChild(bgScript);
    }

    setActiveNavLink();
    checkSystemStatus();
}

function setActiveNavLink() {
    const currentPath = window.location.pathname.split("/").pop() || "dashboard.html";
    const links = document.querySelectorAll(".nav-link");
    links.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            link.classList.add("active");
            const pageTitle = document.getElementById("page-title");
            if (pageTitle) {
                // Just get the text content of the link, excluding the SVG icon
                pageTitle.textContent = link.textContent.trim();
            }
        }
    });
}

async function checkSystemStatus() {
    try {
        const res = await window.api.getSystemStatus();
        updateStatusIndicator("status-backend", res.backend === "Connected", "Backend");
        updateStatusIndicator("status-db", res.database === "Connected", "DB");
        updateStatusIndicator("status-replay", res.replay === "Running" || res.replay === "Completed", `Replay: ${res.replay}`);
        
        const lastUpdated = document.getElementById("last-updated");
        if (lastUpdated) {
            lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    } catch (err) {
        updateStatusIndicator("status-backend", false, "Backend: Offline");
        updateStatusIndicator("status-db", false, "DB: Offline");
        updateStatusIndicator("status-replay", false, "Replay: Offline");
    }
}

function updateStatusIndicator(id, isOk, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = "status-indicator " + (isOk ? "status-ok" : "status-error");
}

async function handleLogout() {
    try {
        await window.api.logout();
    } catch (e) {
        console.warn("Logout error", e);
    }
    localStorage.removeItem("sg_token");
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    // Only render layout if there is a main-content element (skip landing/login)
    if (document.getElementById("main-content")) {
        renderLayout();
        // Periodically update status
        setInterval(checkSystemStatus, 5000);
    }
});
