import { BaseMonster } from './BaseMonster.js';
import { CONFIG } from '../../main.js';
import { lineOfSight, distance } from '../../world/Collision.js';

// ============================================
// PHANTOM - Visibility-based Monster
// Invisible when no LOS, visible when it can see player
// ============================================

// Tuning constants
const PHANTOM_SPEED_INVISIBLE = 1.4;    // Speed multiplier when invisible
const PHANTOM_SPEED_VISIBLE = 0.8;      // Speed multiplier when visible
const PHANTOM_FLICKER_DURATION = 0.5;   // Warning flicker before becoming visible
const PHANTOM_MATERIALIZE_TIME = 0.3;   // Time to fully materialize
const PHANTOM_PHASE_THROUGH_WALLS = true; // Can phase through walls when invisible

export class Phantom extends BaseMonster {
    constructor(x, y, map) {
        super(x, y, map);
        
        this.name = 'Phantom';
        this.description = 'Invisible until it sees you';
        
        // Phantom-specific state
        this.isVisible = false;
        this.hasLOSToPlayer = false;
        this.flickerTimer = 0;
        this.materializeProgress = 0; // 0-1
        this.flickerPhase = 0;
        
        // Visual state
        this.opacity = 0;
        
        // Phasing state
        this.canPhase = true;
    }
    
    // Override movement to allow phasing through walls when invisible
    updateMovement(deltaTime, closedDoors) {
        const currentSpeed = this.getCurrentSpeed();
        
        // If invisible and can phase, move directly without collision
        if (!this.isVisible && PHANTOM_PHASE_THROUGH_WALLS) {
            if (this.target) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 5) {
                    this.x += (dx / dist) * currentSpeed * deltaTime;
                    this.y += (dy / dist) * currentSpeed * deltaTime;
                }
            }
            return;
        }
        
        // Normal movement with collision when visible
        super.updateMovement(deltaTime, closedDoors);
    }
    
    // Override pathfinding - when invisible, go directly to target
    updatePathfinding(deltaTime, closedDoors) {
        if (!this.isVisible && PHANTOM_PHASE_THROUGH_WALLS) {
            // No pathfinding needed when phasing
            this.path = [];
            return;
        }
        super.updatePathfinding(deltaTime, closedDoors);
    }
    
    preUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer) {
        this.hasLOSToPlayer = hasLOS && distToPlayer <= CONFIG.MONSTER_LOS_DISTANCE;
        
        if (this.hasLOSToPlayer) {
            // Has LOS - become visible
            if (!this.isVisible && this.flickerTimer <= 0) {
                // Start flicker warning
                this.flickerTimer = PHANTOM_FLICKER_DURATION;
            }
            
            if (this.flickerTimer > 0) {
                this.flickerTimer -= deltaTime;
                this.flickerPhase += deltaTime * 20;
                // Flicker opacity
                this.opacity = Math.abs(Math.sin(this.flickerPhase)) * 0.5;
                
                if (this.flickerTimer <= 0) {
                    this.isVisible = true;
                }
            } else if (this.isVisible) {
                // Materialize
                this.materializeProgress = Math.min(1, this.materializeProgress + deltaTime / PHANTOM_MATERIALIZE_TIME);
                this.opacity = 0.3 + this.materializeProgress * 0.7;
            }
        } else {
            // No LOS - become invisible
            this.isVisible = false;
            this.flickerTimer = 0;
            this.materializeProgress = 0;
            this.opacity = Math.max(0, this.opacity - deltaTime * 3);
        }
    }
    
    getCurrentSpeed() {
        if (this.isVisible) {
            return this.speed * PHANTOM_SPEED_VISIBLE;
        }
        return this.speed * PHANTOM_SPEED_INVISIBLE;
    }
    
    // Can only kill when visible
    canKillPlayer() {
        return this.isVisible && this.materializeProgress >= 0.8;
    }
    
    // ============================================
    // RENDERING - Semi-transparent, shadow-like
    // ============================================
    
    render(ctx) {
        // Don't render if completely invisible
        if (this.opacity <= 0.05) return;
        
        const x = this.x;
        const y = this.y + this.pulseOffset;
        const s = this.size;
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // Shadow (always slightly visible)
        this.renderShadow(ctx, x, y, s);
        
        // Legs
        this.renderLegs(ctx, x, y, s);
        
        // Body
        this.renderBody(ctx, x, y, s);
        
        // Eyes appear last when materializing
        if (this.materializeProgress > 0.5 || this.flickerTimer > 0) {
            const eyeOpacity = this.isVisible ? 
                Math.min(1, (this.materializeProgress - 0.5) * 2) : 
                Math.abs(Math.sin(this.flickerPhase * 2));
            ctx.globalAlpha = this.opacity * eyeOpacity;
            this.renderEyes(ctx, x, y, s);
        }
        
        ctx.restore();
    }
    
    renderShadow(ctx, x, y, s) {
        // Darker, more spread shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.ellipse(x, this.y + s / 2 + 5, s / 2 + 5, s / 4 + 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderLegs(ctx, x, y, s) {
        // Shadow-like wispy legs
        ctx.strokeStyle = 'rgba(30, 30, 50, 0.8)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.tentaclePhase;
            const tentacleX = x + Math.cos(angle) * (s / 2);
            const tentacleY = y + s / 3;
            
            // Wispy, flowing movement
            const wispOffset = Math.sin(this.tentaclePhase * 1.5 + i * 2) * 8;
            const endX = tentacleX + Math.cos(angle) * 12 + wispOffset;
            const endY = tentacleY + 15 + Math.sin(this.tentaclePhase * 2 + i) * 3;
            
            ctx.beginPath();
            ctx.moveTo(tentacleX, tentacleY);
            ctx.quadraticCurveTo(
                tentacleX + wispOffset / 2,
                tentacleY + 10,
                endX,
                endY
            );
            ctx.stroke();
        }
    }
    
    renderBody(ctx, x, y, s) {
        // Dark purple/black body
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, s / 2 + 2);
        gradient.addColorStop(0, 'rgba(40, 30, 60, 0.9)');
        gradient.addColorStop(0.7, 'rgba(20, 15, 35, 0.8)');
        gradient.addColorStop(1, 'rgba(10, 5, 20, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2 + 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ethereal glow
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, s / 2);
        glowGradient.addColorStop(0, 'rgba(100, 80, 150, 0.2)');
        glowGradient.addColorStop(1, 'rgba(50, 40, 80, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderEyes(ctx, x, y, s) {
        // Glowing white eyes
        ctx.fillStyle = 'rgba(200, 200, 255, 0.9)';
        ctx.shadowColor = 'rgba(150, 150, 255, 0.8)';
        ctx.shadowBlur = 10;
        
        // Two smaller eyes
        const eyeSpacing = 6;
        const eyeY = y - 3;
        
        ctx.beginPath();
        ctx.ellipse(x - eyeSpacing, eyeY, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(x + eyeSpacing, eyeY, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(80, 60, 120, 0.9)';
        ctx.beginPath();
        ctx.arc(x - eyeSpacing + this.eyeOffset.x * 0.5, eyeY + this.eyeOffset.y * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeSpacing + this.eyeOffset.x * 0.5, eyeY + this.eyeOffset.y * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}
