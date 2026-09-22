// splash-screen.js

(function() {
    // Only run on the root / index path
    const path = window.location.pathname;
    const isLanding = path === '/' || path.endsWith('index.html');
    if (!isLanding) return;

    // Check if we should initialize
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return; 
    }
    
    // Only play once per session, but allow forcing via url param for testing
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('replay_intro')) {
        sessionStorage.removeItem('sg_splash');
    }
    
    if (sessionStorage.getItem('sg_splash')) {
        return;
    }
    
    sessionStorage.setItem('sg_splash', 'played');

    // Create the overlay container
    const overlay = document.createElement('div');
    overlay.id = 'sg-splash-screen';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
        backgroundColor: '#030508', zIndex: '99999',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.8s ease-in-out, visibility 0.8s',
        color: '#fff', fontFamily: 'monospace'
    });

    // We'll build the inner HTML for the SVG network, Logo, and Progress Bar
    overlay.innerHTML = `
        <style>
            #sg-splash-screen {
                overflow: hidden;
            }
            .splash-svg-container {
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 600px; height: 600px;
                opacity: 0.6;
                z-index: 1;
            }
            .splash-network-line {
                fill: none;
                stroke: #3b82f6;
                stroke-width: 2;
                stroke-dasharray: 1000;
                stroke-dashoffset: 1000;
                animation: drawLines 2.5s ease-in-out forwards;
            }
            .splash-node {
                fill: #030508;
                stroke: #3b82f6;
                stroke-width: 3;
                opacity: 0;
                animation: fadeInNodes 0.5s ease-out forwards;
            }
            
            .splash-center {
                position: relative;
                z-index: 2;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }
            .splash-logo-container {
                display: flex;
                align-items: center;
                gap: 15px;
                opacity: 0;
                transform: scale(0.9);
                animation: splashLogoAnim 1s ease-out 0.8s forwards;
            }
            .splash-logo-text {
                font-size: 3.5rem;
                font-weight: 800;
                font-family: system-ui, -apple-system, sans-serif;
                color: #e2e8f0;
                letter-spacing: 2px;
                text-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
            }
            .splash-shield {
                width: 50px;
                height: 50px;
                color: #3b82f6;
                filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.8));
            }
            
            .splash-progress-container {
                width: 300px;
                opacity: 0;
                animation: splashFadeIn 0.5s ease-out 1.2s forwards;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }
            .splash-progress-bar-bg {
                width: 100%;
                height: 4px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                overflow: hidden;
                position: relative;
            }
            .splash-progress-bar-fill {
                position: absolute;
                top: 0; left: 0; bottom: 0;
                width: 0%;
                background: #3b82f6;
                box-shadow: 0 0 10px #3b82f6;
                transition: width 0.1s linear;
            }
            .splash-status-text {
                color: #3b82f6;
                font-size: 0.9rem;
                letter-spacing: 1.5px;
                text-transform: uppercase;
            }
            .splash-percentage {
                color: #e2e8f0;
                font-size: 1.2rem;
                font-weight: bold;
                letter-spacing: 1px;
            }
            
            .splash-scan-line {
                position: absolute;
                top: -100px; left: 0; right: 0;
                height: 2px;
                background: #3b82f6;
                box-shadow: 0 0 20px 5px rgba(59, 130, 246, 0.5);
                opacity: 0;
                z-index: 10;
                animation: scanSweep 2s linear 0.5s;
            }

            @keyframes drawLines {
                to { stroke-dashoffset: 0; }
            }
            @keyframes fadeInNodes {
                to { opacity: 1; box-shadow: 0 0 10px #3b82f6; }
            }
            @keyframes splashLogoAnim {
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes splashFadeIn {
                to { opacity: 1; }
            }
            @keyframes scanSweep {
                0% { top: -10px; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 110vh; opacity: 0; }
            }
            
            .skip-hint {
                position: absolute;
                bottom: 30px;
                color: rgba(255,255,255,0.3);
                font-size: 0.8rem;
                letter-spacing: 1px;
                cursor: pointer;
                transition: color 0.2s;
            }
            .skip-hint:hover {
                color: rgba(255,255,255,0.8);
            }
        </style>
        
        <!-- Radar Scan Line -->
        <div class="splash-scan-line"></div>
        
        <!-- Animated SVG Background -->
        <div class="splash-svg-container">
            <svg width="100%" height="100%" viewBox="0 0 600 600">
                <!-- Lines -->
                <path class="splash-network-line" d="M 100 100 L 300 250 L 500 150 L 450 400 L 250 500 L 150 350 Z" />
                <path class="splash-network-line" d="M 300 250 L 450 400" />
                <path class="splash-network-line" d="M 300 250 L 150 350" />
                <path class="splash-network-line" d="M 100 100 L 150 350" />
                
                <!-- Nodes -->
                <circle class="splash-node" cx="100" cy="100" r="8" style="animation-delay: 0.1s" />
                <circle class="splash-node" cx="300" cy="250" r="10" style="animation-delay: 0.5s" />
                <circle class="splash-node" cx="500" cy="150" r="8" style="animation-delay: 0.8s" />
                <circle class="splash-node" cx="450" cy="400" r="8" style="animation-delay: 1.2s" />
                <circle class="splash-node" cx="250" cy="500" r="12" style="animation-delay: 1.6s" />
                <circle class="splash-node" cx="150" cy="350" r="8" style="animation-delay: 2.0s" />
            </svg>
        </div>
        
        <!-- Center Content -->
        <div class="splash-center">
            <div class="splash-logo-container">
                <svg class="splash-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M12 8v4"/>
                    <path d="M12 16h.01"/>
                </svg>
                <div class="splash-logo-text">SentinelGraph</div>
            </div>
            
            <div class="splash-progress-container">
                <div class="splash-progress-bar-bg">
                    <div class="splash-progress-bar-fill" id="sg-splash-fill"></div>
                </div>
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <div class="splash-status-text" id="sg-splash-status">Initializing...</div>
                    <div class="splash-percentage" id="sg-splash-pct">0%</div>
                </div>
            </div>
        </div>
        
        <div class="skip-hint" id="sg-splash-skip">Click anywhere to skip</div>
    `;

    document.body.appendChild(overlay);

    // Animation Logic
    const fillEl = document.getElementById('sg-splash-fill');
    const pctEl = document.getElementById('sg-splash-pct');
    const statusEl = document.getElementById('sg-splash-status');
    
    let progress = 0;
    const duration = 2800; // Total duration in ms
    const startTime = performance.now();
    
    const messages = [
        { pct: 0, text: "Initializing threat detection..." },
        { pct: 30, text: "Loading network models..." },
        { pct: 60, text: "Establishing secure uplinks..." },
        { pct: 90, text: "Ready" }
    ];
    
    let animationFrame;
    
    function updateProgress(time) {
        const elapsed = time - startTime;
        progress = Math.min(100, (elapsed / duration) * 100);
        
        fillEl.style.width = progress + '%';
        pctEl.textContent = Math.floor(progress) + '%';
        
        // Update status text
        const currentMsg = messages.slice().reverse().find(m => progress >= m.pct);
        if (currentMsg) {
            statusEl.textContent = currentMsg.text;
        }
        
        if (progress < 100) {
            animationFrame = requestAnimationFrame(updateProgress);
        } else {
            finishSplash();
        }
    }
    
    function finishSplash() {
        cancelAnimationFrame(animationFrame);
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 800);
    }
    
    // Start progress
    animationFrame = requestAnimationFrame(updateProgress);
    
    // Skip on click
    overlay.addEventListener('click', finishSplash);
    
})();
