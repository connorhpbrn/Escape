import { CONFIG } from '../main.js';

export class Exit {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 40;
        this.interactRadius = 50;
        
        this.isUnlocked = false;
        this.isSpawned = false; // Exit only appears after generators are done
        this.pulsePhase = 0;
        this.spawnAnimation = 0; // For spawn-in effect
        
        // Particles for unlocked state
        this.particles = [];
    }
    
    // Spawn the exit at a new position
    spawnAt(x, y) {
        this.x = x;
        this.y = y;
        this.isSpawned = true;
        this.isUnlocked = true;
        this.spawnAnimation = 0;
        
        // Burst of particles on spawn
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.5 + Math.random() * 0.5,
                maxLife: 2,
                size: 4 + Math.random() * 6,
            });
        }
    }
    
    unlock() {
        this.isUnlocked = true;
        
        // Burst of particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 60;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1 + Math.random() * 0.5,
                maxLife: 1.5,
                size: 3 + Math.random() * 4,
            });
        }
    }
    
    update(deltaTime) {
        this.pulsePhase += deltaTime * 4;
        
        // Spawn animation
        if (this.isSpawned && this.spawnAnimation < 1) {
            this.spawnAnimation = Math.min(1, this.spawnAnimation + deltaTime * 2);
        }
        
        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime;
            return p.life > 0;
        });
        
        // Emit particles when spawned
        if (this.isSpawned && Math.random() < deltaTime * 3) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
                x: this.x + Math.cos(angle) * 20,
                y: this.y + Math.sin(angle) * 20,
                vx: Math.cos(angle) * 20,
                vy: -30 - Math.random() * 20,
                life: 0.8,
                maxLife: 0.8,
                size: 2 + Math.random() * 3,
            });
        }
    }
    
    isPlayerInRange(player) {
        if (!this.isSpawned) return false;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.interactRadius;
    }
    
    render(ctx) {
        // Don't render if not spawned yet
        if (!this.isSpawned) return;
        
        const x = this.x;
        const y = this.y;
        const s = this.size * this.spawnAnimation; // Scale up during spawn
        
        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `rgba(0, 255, 150, ${alpha})`;
            ctx.beginPath();
            ctx.rect(p.x - p.size/2, p.y - p.size/2, p.size, p.size); // Square particles
            ctx.fill();
        }
        
        // Pulsing glow effect
        const glowSize = s * 1.5 + Math.sin(this.pulsePhase) * 10;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        gradient.addColorStop(0, 'rgba(0, 255, 100, 0.6)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 100, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.rect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);
        ctx.fill();
        
        // Main green square
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        
        // Border
        ctx.strokeStyle = '#00b894';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - s / 2, y - s / 2, s, s);
        
        // Inner highlight square
        const innerSize = s * 0.6;
        ctx.fillStyle = '#55efc4';
        ctx.fillRect(x - innerSize / 2, y - innerSize / 2, innerSize, innerSize);
        
        // Status text - EXIT label
        ctx.fillStyle = '#00ff88';
        ctx.font = '10px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', x, y - s / 2 - 15);
        ctx.textAlign = 'left';
    }
}
