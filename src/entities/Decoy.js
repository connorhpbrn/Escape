import { CONFIG } from '../main.js';

export class Decoy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        
        this.active = true;
        this.lifeTimer = CONFIG.DECOY_LURE_TIME;
        
        this.pulsePhase = 0;
        this.particles = [];
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.lifeTimer -= deltaTime;
        this.pulsePhase += deltaTime * 8;
        
        if (this.lifeTimer <= 0) {
            this.active = false;
        }
        
        // Emit particles
        if (Math.random() < deltaTime * 15) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
                x: this.x + Math.cos(angle) * 10,
                y: this.y + Math.sin(angle) * 10,
                vx: Math.cos(angle) * 30,
                vy: Math.sin(angle) * 30 - 20,
                life: 0.5,
                maxLife: 0.5,
                size: 3 + Math.random() * 3,
            });
        }
        
        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime;
            return p.life > 0;
        });
    }
    
    render(ctx) {
        if (!this.active) {
            // Render fading particles only
            for (const p of this.particles) {
                const alpha = p.life / p.maxLife * 0.5;
                ctx.fillStyle = `rgba(255, 150, 50, ${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            return;
        }
        
        const x = this.x;
        const y = this.y;
        const s = this.size;
        
        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `rgba(255, 150, 50, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Glow
        const glowSize = s + Math.sin(this.pulsePhase) * 5;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        gradient.addColorStop(0, 'rgba(255, 150, 50, 0.6)');
        gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#ff9500';
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner glow
        ctx.fillStyle = 'rgba(255, 255, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y - 2, s / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Timer ring
        const progress = this.lifeTimer / CONFIG.DECOY_LURE_TIME;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, s / 2 + 5, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
    }
}
