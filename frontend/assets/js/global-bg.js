// global-bg.js

(function() {
    // 1. Check if we should initialize
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return; // Don't run this heavy animation if reduced motion is requested
    }
    
    // Prevent duplicate canvases
    if (document.getElementById('sg-global-bg')) {
        return;
    }

    // 2. Create and append the canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'sg-global-bg';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // 3. Determine Page Mode
    const path = window.location.pathname;
    const isLanding = path === '/' || path.endsWith('index.html');
    const isLogin = path.endsWith('login.html');
    
    // Mode configs
    let NETWORK_RADIUS = isLanding ? 350 : 450;
    let NODE_COUNT = isLanding ? 100 : (isLogin ? 60 : 40);
    let PACKET_COUNT = isLanding ? 60 : (isLogin ? 30 : 15);
    
    let baseAlpha = isLanding ? 1.0 : (isLogin ? 0.5 : 0.2); // Opacity multiplier
    
    // 4. Cinematic Intro State
    let isIntroPlaying = false;
    let introStartTime = 0;
    let introDuration = 3000; // 3 seconds
    
    if (isLanding) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('replay_intro')) {
            sessionStorage.removeItem('sg_intro');
        }
        
        if (!sessionStorage.getItem('sg_intro_cam')) {
            isIntroPlaying = true;
            introStartTime = performance.now();
            sessionStorage.setItem('sg_intro_cam', 'played');
        }
    }
    
    // 5. Engine State
    let width, height;
    let nodes = [];
    let edges = [];
    let packets = [];
    let animationId;
    
    let camX = 0, camY = 0, camZ = isLanding ? -600 : -800;
    
    let targetRotX = 0, targetRotY = 0;
    let currentRotX = 0, currentRotY = 0;
    
    let mouseX = -1000, mouseY = -1000;
    let hoveredNode = null;
    
    // Create Tooltip for landing page
    let tooltip = null;
    if (isLanding) {
        tooltip = document.createElement('div');
        Object.assign(tooltip.style, {
            position: 'absolute', pointerEvents: 'none', background: 'rgba(5, 8, 15, 0.9)',
            border: '1px solid #3b82f6', padding: '10px 15px', borderRadius: '4px',
            fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff',
            opacity: '0', transition: 'opacity 0.2s', zIndex: '1000',
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)'
        });
        document.body.appendChild(tooltip);
    }
    
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', () => { resize(); init(); });
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        const nx = (mouseX / width) * 2 - 1;
        const ny = (mouseY / height) * 2 - 1;
        targetRotY = nx * 0.3;
        targetRotX = ny * 0.2;
    });
    window.addEventListener('mouseleave', () => {
        mouseX = -1000; mouseY = -1000;
        targetRotX = 0; targetRotY = 0;
        if(tooltip) tooltip.style.opacity = 0;
    });

    class Node3D {
        constructor(id) {
            this.id = `NODE-${id.toString().padStart(2, '0')}`;
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = NETWORK_RADIUS * (0.5 + Math.random() * 0.5); 
            
            this.x = r * Math.sin(phi) * Math.cos(theta);
            this.y = r * Math.sin(phi) * Math.sin(theta);
            this.z = r * Math.cos(phi);
            
            this.projX = 0; this.projY = 0; this.scale = 0; this.depth = 0;
            
            this.isThreat = Math.random() > 0.92;
            this.label = this.isThreat ? "THREAT PATH" : "SECURE RELAY";
            
            // For intro animation
            this.appearTime = Math.random() * 3000; // 0 to 3s
        }
    }

    class Edge3D {
        constructor(source, target) {
            this.source = source;
            this.target = target;
        }
    }
    
    class Packet3D {
        constructor(edge) {
            this.edge = edge;
            this.progress = Math.random();
            this.speed = 0.005 + Math.random() * 0.01;
            this.isThreat = edge.source.isThreat || edge.target.isThreat;
        }
        update() {
            this.progress += this.speed;
            if (this.progress >= 1) {
                this.progress = 0;
                this.edge = edges[Math.floor(Math.random() * edges.length)];
                this.isThreat = this.edge.source.isThreat || this.edge.target.isThreat;
            }
        }
    }

    function init() {
        nodes = [];
        edges = [];
        packets = [];
        
        for (let i = 0; i < NODE_COUNT; i++) {
            nodes.push(new Node3D(i));
        }
        
        for (let i = 0; i < nodes.length; i++) {
            let distances = [];
            for (let j = 0; j < nodes.length; j++) {
                if (i !== j) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dz = nodes[i].z - nodes[j].z;
                    distances.push({ node: nodes[j], dist: Math.sqrt(dx*dx + dy*dy + dz*dz) });
                }
            }
            distances.sort((a,b) => a.dist - b.dist);
            const connCount = 2 + Math.floor(Math.random() * 2);
            for (let k = 0; k < connCount; k++) {
                edges.push(new Edge3D(nodes[i], distances[k].node));
            }
        }
        
        for (let i = 0; i < PACKET_COUNT; i++) {
            if(edges.length > 0) packets.push(new Packet3D(edges[Math.floor(Math.random() * edges.length)]));
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);
        
        let introProgress = 1;
        let globalAlpha = baseAlpha;
        
        if (isIntroPlaying) {
            const elapsed = time - introStartTime;
            if (elapsed >= introDuration) {
                isIntroPlaying = false;
            } else {
                // Intro cinematic logic
                introProgress = elapsed / introDuration; // 0 to 1
                
                // Camera starts very far out and zooms in
                camZ = -2000 + (Math.sin(introProgress * Math.PI / 2) * (2000 - 600));
                
                // Intense auto rotation that slows down
                targetRotY += 0.01 * (1 - introProgress);
            }
        } else {
            camZ = isLanding ? -600 : -800; // Reset
        }

        currentRotX += (targetRotX - currentRotX) * 0.05;
        currentRotY += (targetRotY - currentRotY) * 0.05;
        
        // Continuous auto-rotation
        const autoRotY = time * 0.0001;
        
        const finalRotX = currentRotX;
        const finalRotY = currentRotY + autoRotY;

        const cosX = Math.cos(finalRotX); const sinX = Math.sin(finalRotX);
        const cosY = Math.cos(finalRotY); const sinY = Math.sin(finalRotY);
        
        const perspective = 800;

        // Project
        for (let i = 0; i < nodes.length; i++) {
            let n = nodes[i];
            
            // Intro appear logic
            let nodeAlphaMult = 1;
            if (isIntroPlaying) {
                const elapsed = time - introStartTime;
                if (elapsed < n.appearTime) nodeAlphaMult = 0;
                else nodeAlphaMult = Math.min(1, (elapsed - n.appearTime) / 1000);
            }
            n.alphaMult = nodeAlphaMult;
            
            let x1 = n.x * cosY - n.z * sinY; let z1 = n.z * cosY + n.x * sinY;
            let y2 = n.y * cosX - z1 * sinX; let z2 = z1 * cosX + n.y * sinX;
            
            n.depth = z2;
            n.scale = perspective / (perspective + z2 + Math.abs(camZ));
            
            // Shift slightly right on landing, center elsewhere
            const shiftX = isLanding ? (width * 0.25) : 0;
            
            n.projX = (width * 0.5) + shiftX + x1 * n.scale;
            n.projY = (height * 0.5) + y2 * n.scale;
        }
        
        // Draw Edges
        ctx.lineWidth = 1;
        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            if (e.source.alphaMult === 0 || e.target.alphaMult === 0) continue;
            
            const avgDepth = (e.source.depth + e.target.depth) / 2;
            let alpha = Math.max(0.02, 1 - (avgDepth + NETWORK_RADIUS) / (NETWORK_RADIUS * 2));
            alpha *= globalAlpha * e.source.alphaMult;
            
            ctx.beginPath();
            ctx.moveTo(e.source.projX, e.source.projY);
            ctx.lineTo(e.target.projX, e.target.projY);
            
            // Threat paths light up dramatically in intro 4-6s
            let isThreatPath = e.source.isThreat || e.target.isThreat;
            if (isIntroPlaying && introProgress > 0.5 && introProgress < 0.75 && isThreatPath) {
                alpha = 1.0;
                ctx.lineWidth = 2;
            } else {
                ctx.lineWidth = 1;
            }
            
            if (isThreatPath) {
                ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.6})`;
            } else {
                ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.4})`;
            }
            ctx.stroke();
        }
        
        // Draw Packets
        for (let i = 0; i < packets.length; i++) {
            const p = packets[i];
            if (p.edge.source.alphaMult === 0) continue; // Don't draw if edge hasn't appeared
            
            p.update();
            const src = p.edge.source; const tgt = p.edge.target;
            
            const px = src.projX + (tgt.projX - src.projX) * p.progress;
            const py = src.projY + (tgt.projY - src.projY) * p.progress;
            const pDepth = src.depth + (tgt.depth - src.depth) * p.progress;
            
            let alpha = Math.max(0.05, 1 - (pDepth + NETWORK_RADIUS) / (NETWORK_RADIUS * 2));
            alpha *= globalAlpha;
            
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            if (p.isThreat) {
                ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
                ctx.shadowColor = `rgba(239, 68, 68, ${alpha})`;
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.shadowColor = `rgba(255, 255, 255, ${alpha})`;
            }
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Draw Nodes & Raycast
        let newHovered = null;
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.alphaMult === 0) continue;
            
            let alpha = Math.max(0.05, 1 - (n.depth + NETWORK_RADIUS) / (NETWORK_RADIUS * 2));
            alpha *= globalAlpha * n.alphaMult;
            
            const baseRadius = n.isThreat ? 3.5 : 2;
            const radius = Math.max(0.5, baseRadius * n.scale);
            
            // Raycast only if landing page
            if (isLanding) {
                const dx = mouseX - n.projX;
                const dy = mouseY - n.projY;
                if (dx*dx + dy*dy < (radius*radius + 40)) {
                    if (!newHovered || n.depth < newHovered.depth) {
                        newHovered = n;
                    }
                }
            }

            // Pulse effect for threats
            let drawRadius = radius;
            if (n.isThreat) {
                drawRadius += Math.sin(time * 0.005) * 1.5;
            }
            drawRadius = Math.max(0.1, drawRadius); // Prevent negative radius Error

            const isHovered = (hoveredNode === n);

            ctx.beginPath();
            ctx.arc(n.projX, n.projY, isHovered ? drawRadius * 2 : drawRadius, 0, Math.PI * 2);
            
            if (n.isThreat) {
                ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
                ctx.shadowColor = `rgba(239, 68, 68, ${alpha})`;
                ctx.shadowBlur = isHovered ? 20 : 10;
            } else {
                ctx.fillStyle = isHovered ? `rgba(255, 255, 255, ${alpha})` : `rgba(59, 130, 246, ${alpha})`;
                ctx.shadowColor = isHovered ? `rgba(255, 255, 255, ${alpha})` : 'transparent';
                ctx.shadowBlur = isHovered ? 15 : 0;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Tooltip logic
        if (isLanding && tooltip) {
            if (newHovered !== hoveredNode) {
                hoveredNode = newHovered;
                if (hoveredNode) {
                    tooltip.innerHTML = `<strong>${hoveredNode.id}</strong><br><span style="color:${hoveredNode.isThreat ? 'var(--accent-red)' : 'var(--text-secondary)'}">${hoveredNode.label}</span>`;
                    tooltip.style.opacity = 1;
                } else {
                    tooltip.style.opacity = 0;
                }
            }
            if (hoveredNode) {
                tooltip.style.left = (hoveredNode.projX + 15) + 'px';
                tooltip.style.top = (hoveredNode.projY - 15) + 'px';
            }
        }

        animationId = requestAnimationFrame(draw);
    }

    resize();
    init();
    animationId = requestAnimationFrame(draw);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(animationId);
        else animationId = requestAnimationFrame(draw);
    });
})();
