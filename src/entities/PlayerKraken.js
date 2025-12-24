import { CONFIG } from '../main.js';
import { resolveCollision } from '../world/Collision.js';

// ============================================
// PLAYER-CONTROLLED KRAKEN - For Reverse Mode
// Human controls the monster to catch the AI player
// ============================================

export class PlayerKraken {
    constructor(x, y, map) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.MONSTER_SIZE;
        this.speed = CONFIG.MONSTER_BASE_SPEED * 1.1;
        this.map = map;
        
        // Animation
        this.pulseOffset = 0;
        this.eyeOffset = { x: 0, y: 0 };
        this.tentaclePhase = 0;
        
        // Footstep tracking
        this.footsteps = [];
        this.maxFootsteps = 30;
        
        this.name = 'Kraken';
    }
    
    // Track AI player footsteps
    addFootstep(x, y) {
        this.footsteps.push({
            x, y,
            life: 5.0,
            maxLife: 5.0
        });
        
        if (this.footsteps.length > this.maxFootsteps) {
            this.footsteps.shift();
        }
    }
    
    update(deltaTime, keys, aiPlayer) {
        // Animation
        this.tentaclePhase += deltaTime * 3;
        this.pulseOffset = Math.sin(this.tentaclePhase) * 2;
        
        // Update footsteps
        this.footsteps = this.footsteps.filter(f => {
            f.life -= deltaTime;
            return f.life > 0;
        });
        
        // Input
        let dx = 0;
        let dy = 0;
        
        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }
        
        // Apply movement
        const vx = dx * this.speed * deltaTime;
        const vy = dy * this.speed * deltaTime;
        
        // resolveCollision expects (x, y, vx, vy, size, map, doors, isMonster)
        const resolved = resolveCollision(
            this.x, this.y, vx, vy,
            this.size, this.map, [], true
        );
        
        this.x = resolved.x;
        this.y = resolved.y;
        
        // Eye tracking
        if (aiPlayer) {
            const lookDx = aiPlayer.x - this.x;
            const lookDy = aiPlayer.y - this.y;
            const lookDist = Math.sqrt(lookDx * lookDx + lookDy * lookDy) || 1;
            this.eyeOffset.x = (lookDx / lookDist) * 3;
            this.eyeOffset.y = (lookDy / lookDist) * 2;
        }
    }
    
    // Render footsteps (called before flashlight effect)
    renderFootsteps(ctx) {
        for (const f of this.footsteps) {
            const alpha = (f.life / f.maxLife) * 0.6;
            ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    render(ctx) {
        const x = this.x;
        const y = this.y + this.pulseOffset;
        const s = this.size;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, this.y + s / 2 + 3, s / 2 + 2, s / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tentacles
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.tentaclePhase;
            const tentacleX = x + Math.cos(angle) * (s / 2);
            const tentacleY = y + s / 3;
            const endX = tentacleX + Math.cos(angle + Math.sin(this.tentaclePhase + i)) * 15;
            const endY = tentacleY + 10 + Math.sin(this.tentaclePhase * 2 + i) * 5;
            
            ctx.beginPath();
            ctx.moveTo(tentacleX, tentacleY);
            ctx.quadraticCurveTo(
                tentacleX + (endX - tentacleX) / 2,
                tentacleY + 15,
                endX,
                endY
            );
            ctx.stroke();
        }
        
        // Body
        ctx.fillStyle = '#c0392b';
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2 + 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner glow
        const gradient = ctx.createRadialGradient(x, y - 5, 0, x, y, s / 2);
        gradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
        gradient.addColorStop(1, 'rgba(139, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, y - 3, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupil
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x, y - 3 + this.eyeOffset.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x - 2, y - 5 + this.eyeOffset.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
