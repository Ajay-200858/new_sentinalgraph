document.addEventListener('DOMContentLoaded', () => {
    initLandingCanvas();
    setupScrollReveal();

    const skipBtn = document.getElementById('skipAnimationBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            finishOpeningAnimation();
        });
    }
});

let animationState = 'START'; // START -> NODES -> CONNECTIONS -> TRAFFIC -> THREAT -> IDLE
let animationFinished = false;

function finishOpeningAnimation() {
    if (animationFinished) return;
    animationFinished = true;
    animationState = 'IDLE';
    
    // Hide skip button
    const skipBtn = document.getElementById('skipAnimationBtn');
    if (skipBtn) skipBtn.style.display = 'none';

    // Reveal content
    const content = document.getElementById('landingContent');
    if (content) {
        content.classList.remove('hidden');
        // Small delay to allow CSS transition if any
        setTimeout(() => content.classList.add('visible'), 50);
    }
}

function initLandingCanvas() {
    const canvas = document.getElementById('landingCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    
    const nodes = [];
    const connections = [];
    const trafficPulses = [];
    
    // Configuration
    const numNodes = 45;
    const connectionDistance = 250;
    
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Node class
    class Node {
        constructor(id, isThreat = false) {
            this.id = id;
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            // 3D effect: z affects size, speed, and opacity
            this.z = Math.random() * 2 + 0.5; 
            this.baseRadius = (Math.random() * 2 + 1.5) * this.z;
            this.vx = (Math.random() - 0.5) * 0.4 * this.z;
            this.vy = (Math.random() - 0.5) * 0.4 * this.z;
            this.opacity = 0; // Starts invisible
            this.targetOpacity = Math.random() * 0.5 + 0.2;
            this.isThreat = isThreat;
            this.color = isThreat ? 'rgba(255, 23, 68, 1)' : `rgba(0, 240, 255, ${this.targetOpacity})`;
            this.highlighted = false;
        }

        update() {
            // Intro fade in
            if (animationState !== 'START' && this.opacity < this.targetOpacity) {
                this.opacity += 0.005;
            }

            // Movement
            this.x += this.vx;
            this.y += this.vy;
            
            // Bounds
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.baseRadius + (this.highlighted ? 2 : 0), 0, Math.PI * 2);
            
            if (this.isThreat && animationState === 'THREAT') {
                ctx.fillStyle = `rgba(255, 23, 68, ${this.opacity + 0.4})`;
                ctx.shadowBlur = 15;
                ctx.shadowColor = 'rgba(255, 23, 68, 0.8)';
            } else if (this.highlighted) {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity + 0.5})`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
            } else {
                ctx.fillStyle = `rgba(0, 240, 255, ${this.opacity})`;
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0; // reset
        }
    }

    class Pulse {
        constructor(startX, startY, endX, endY, isThreat = false) {
            this.x = startX;
            this.y = startY;
            this.endX = endX;
            this.endY = endY;
            this.progress = 0;
            this.speed = 0.01 + Math.random() * 0.02;
            this.isThreat = isThreat;
        }

        update() {
            this.progress += this.speed;
            this.x = this.x + (this.endX - this.x) * this.speed;
            this.y = this.y + (this.endY - this.y) * this.speed;
            return this.progress >= 1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = this.isThreat ? 'rgba(255, 23, 68, 0.8)' : 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
        }
    }

    // Initialize nodes
    let threatNodeId = Math.floor(Math.random() * numNodes);
    for (let i = 0; i < numNodes; i++) {
        nodes.push(new Node(i, i === threatNodeId));
    }

    // Animation Story Timeline
    setTimeout(() => { animationState = 'NODES'; }, 500);
    setTimeout(() => { animationState = 'CONNECTIONS'; }, 1500);
    setTimeout(() => { animationState = 'TRAFFIC'; }, 2500);
    setTimeout(() => { 
        animationState = 'THREAT'; 
        showThreatLabel(nodes[threatNodeId]);
    }, 3500);
    setTimeout(() => { 
        finishOpeningAnimation(); 
    }, 5000);

    function showThreatLabel(node) {
        if(animationFinished) return;
        const container = document.getElementById('threatLabelsContainer');
        if (!container) return;
        
        const label = document.createElement('div');
        label.className = 'threat-label-overlay';
        label.innerHTML = '⚠️ THREAT SIGNAL DETECTED<br><span style="font-size:0.7em;color:#fff;">RISK PROJECTION UPDATED</span>';
        // Position relative to canvas center right
        label.style.left = '60%';
        label.style.top = '40%';
        container.appendChild(label);
        
        setTimeout(() => {
            if(label.parentNode) label.parentNode.removeChild(label);
        }, 3000);
    }

    let lastTime = 0;
    
    function animate(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        ctx.clearRect(0, 0, width, height);
        
        // Only render heavily if tab is visible to save CPU
        if (document.hidden) {
            requestAnimationFrame(animate);
            return;
        }

        // Draw connections
        if (animationState !== 'START' && animationState !== 'NODES') {
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        
                        let alpha = 0;
                        if (animationState === 'IDLE') {
                            alpha = 0.1 * (1 - dist / connectionDistance);
                        } else {
                            alpha = 0.25 * (1 - dist / connectionDistance);
                        }

                        // Highlight connections to threat node
                        let isThreatEdge = false;
                        if (animationState === 'THREAT' && (nodes[i].isThreat || nodes[j].isThreat)) {
                            isThreatEdge = true;
                            alpha *= 2;
                        }

                        ctx.strokeStyle = isThreatEdge ? `rgba(255, 23, 68, ${alpha})` : `rgba(0, 240, 255, ${alpha})`;
                        ctx.lineWidth = isThreatEdge ? 1.5 : 0.8;
                        ctx.stroke();

                        // Occasionally spawn traffic
                        if ((animationState === 'TRAFFIC' || animationState === 'THREAT' || animationState === 'IDLE') && Math.random() < 0.002) {
                            trafficPulses.push(new Pulse(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y, isThreatEdge));
                        }
                    }
                }
            }
        }

        // Update & draw pulses
        for (let i = trafficPulses.length - 1; i >= 0; i--) {
            const isDone = trafficPulses[i].update();
            trafficPulses[i].draw();
            if (isDone) trafficPulses.splice(i, 1);
        }

        // Update & draw nodes
        nodes.forEach(node => {
            if (animationState === 'IDLE') {
                // slow down node movement in idle state
                node.vx *= 0.99;
                node.vy *= 0.99;
            }
            node.update();
            node.draw();
        });

        requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
}

function setupScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach(el => observer.observe(el));
}
