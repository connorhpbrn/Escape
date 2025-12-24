import { CONFIG } from '../main.js';

export class Generator {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.size = 28;
        this.interactRadius = CONFIG.GENERATOR_INTERACT_RADIUS;
        this.activateTime = CONFIG.GENERATOR_ACTIVATE_TIME;
        
        this.isActive = false;
        this.activationProgress = 0;
        this.isBeingActivated = false;
        
        // Visual
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.sparkParticles = [];
    }
    
    update(deltaTime) {
        this.pulsePhase += deltaTime * 3;
        
        // Update spark particles
        this.sparkParticles = this.sparkParticles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += 100 * deltaTime; // gravity
            p.life -= deltaTime;
            return p.life > 0;
        });
        
        // Active generators emit occasional sparks
        if (this.isActive && Math.random() < deltaTime * 2) {
            this.emitSpark();
        }
    }
    
    startActivation() {
        if (!this.isActive) {
            this.isBeingActivated = true;
        }
    }
    
    updateActivation(deltaTime) {
        if (this.isBeingActivated && !this.isActive) {
            this.activationProgress += deltaTime / this.activateTime;
            
            // Emit sparks during activation
            if (Math.random() < deltaTime * 10) {
                this.emitSpark();
            }
            
            if (this.activationProgress >= 1) {
                this.isActive = true;
                this.activationProgress = 1;
                this.isBeingActivated = false;
                
                // Burst of sparks on completion
                for (let i = 0; i < 15; i++) {
                    this.emitSpark();
                }
                
                return true; // Activation complete
            }
        }
        return false;
    }
    
    cancelActivation() {
        this.isBeingActivated = false;
        this.activationProgress = 0;
    }
    
    emitSpark() {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        
        // Green sparks to match activation
        const color = Math.random() < 0.5 ? '#00ff88' : '#e0ffe0';
        
        this.sparkParticles.push({
            x: this.x + (Math.random() - 0.5) * 20,
            y: this.y + (Math.random() - 0.5) * 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 50,
            life: 0.3 + Math.random() * 0.3,
            maxLife: 0.5,
            size: 2 + Math.random() * 3,
            color: color,
        });
    }
    
    isPlayerInRange(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.interactRadius;
    }
    
    render(ctx, flashlightMode = false) {
        const x = this.x;
        const y = this.y;
        const s = this.size;
        
        // Spark particles
        for (const p of this.sparkParticles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Glow effect
        const glowIntensity = this.isActive ? 0.6 : (0.2 + Math.sin(this.pulsePhase) * 0.15);
        const glowColor = this.isActive ? 'rgba(0, 255, 136, ' : 'rgba(255, 200, 0, ';
        
        if (!flashlightMode || this.isActive) {
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, s * 1.5);
            gradient.addColorStop(0, glowColor + glowIntensity + ')');
            gradient.addColorStop(1, glowColor + '0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, s * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Base
        // Body color based on state: Inactive = Red, Active = Green (matching ring)
        const bodyColor = this.isActive ? '#00cc6a' : '#d63031';
        
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.rect(x - s / 2, y - s / 2, s, s);
        ctx.fill();
        ctx.stroke();
        
        // Top panel
        ctx.fillStyle = this.isActive ? '#00ff88' : '#ff7675';
        ctx.beginPath();
        ctx.rect(x - s / 3, y - s / 3, s * 2 / 3, s * 2 / 3);
        ctx.fill();
        
        // Removed status indicator dot
        
        // Activation progress ring
        if (this.isBeingActivated && !this.isActive) {
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(x, y, s / 2 + 8, -Math.PI / 2, -Math.PI / 2 + this.activationProgress * Math.PI * 2);
            ctx.stroke();
        }
        
        // Bolts/details - now squares
        ctx.fillStyle = '#000000';
        const boltPositions = [
            { x: x - s / 3, y: y - s / 3 },
            { x: x + s / 3, y: y - s / 3 },
            { x: x - s / 3, y: y + s / 3 },
            { x: x + s / 3, y: y + s / 3 },
        ];
        
        for (const pos of boltPositions) {
            ctx.beginPath();
            ctx.rect(pos.x - 3.5, pos.y - 3.5, 7, 7);
            ctx.fill();
        }
    }
}
