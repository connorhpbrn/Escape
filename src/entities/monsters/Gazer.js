import { BaseMonster } from './BaseMonster.js';
import { CONFIG } from '../../main.js';
import { lineOfSight } from '../../world/Collision.js';

// ============================================
// GAZER - "Don't Look" Monster
// Fast when unseen, almost frozen when visible
// ============================================

// Tuning constants
const GAZER_SPEED_VISIBLE = 0.2;      // Speed multiplier when player sees it
const GAZER_SPEED_UNSEEN = 1.6;       // Speed multiplier when unseen
const GAZER_STARE_THRESHOLD = 3.0;    // Seconds of staring before circling
const GAZER_CIRCLE_DURATION = 2.0;    // How long to circle instead of chase
const GAZER_LEG_STRETCH_UNSEEN = 1.5; // Leg stretch multiplier when sprinting

export class Gazer extends BaseMonster {
    constructor(x, y, map) {
        super(x, y, map);
        
        this.name = 'Gazer';
        this.description = 'Freezes when watched, sprints when unseen';
        
        // Gazer-specific state
        this.isBeingWatched = false;
        this.stareTimer = 0;
        this.isCircling = false;
        this.circleTimer = 0;
        this.circleAngle = 0;
        
        // Visual state
        this.bodyStiffness = 0; // 0-1, how stiff the body is
        this.legStretch = 1;    // Multiplier for leg length
    }
    
    preUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer) {
        // Check if player can see the Gazer (reverse LOS check)
        const playerCanSeeGazer = lineOfSight(player.x, player.y, this.x, this.y, this.map);
        const inPlayerView = playerCanSeeGazer && distToPlayer <= 200; // Flashlight range
        
        this.isBeingWatched = inPlayerView;
        
        if (this.isBeingWatched) {
            // Being watched - stiffen up
            this.bodyStiffness = Math.min(1, this.bodyStiffness + deltaTime * 3);
            this.legStretch = Math.max(1, this.legStretch - deltaTime * 2);
            
            // Track stare time
            this.stareTimer += deltaTime;
            
            // If stared at too long, start circling
            if (this.stareTimer >= GAZER_STARE_THRESHOLD && !this.isCircling) {
                this.isCircling = true;
                this.circleTimer = GAZER_CIRCLE_DURATION;
                this.circleAngle = Math.atan2(this.y - player.y, this.x - player.x);
            }
        } else {
            // Not being watched - loosen up and sprint
            this.bodyStiffness = Math.max(0, this.bodyStiffness - deltaTime * 2);
            this.legStretch = Math.min(GAZER_LEG_STRETCH_UNSEEN, this.legStretch + deltaTime * 3);
            this.stareTimer = 0;
            this.isCircling = false;
        }
        
        // Update circling
        if (this.isCircling) {
            this.circleTimer -= deltaTime;
            if (this.circleTimer <= 0) {
                this.isCircling = false;
            } else {
                // Circle around the player
                this.circleAngle += deltaTime * 1.5;
                const circleRadius = 150;
                this.target = {
                    x: player.x + Math.cos(this.circleAngle) * circleRadius,
                    y: player.y + Math.sin(this.circleAngle) * circleRadius
                };
            }
        }
    }
    
    getCurrentSpeed() {
        if (this.isBeingWatched) {
            return this.speed * GAZER_SPEED_VISIBLE;
        }
        return this.speed * GAZER_SPEED_UNSEEN;
    }
    
    // Only use prediction when unseen
    getPredictedTarget(player) {
        if (this.isBeingWatched) {
            return { x: player.x, y: player.y };
        }
        return super.getPredictedTarget(player);
    }
    
    // ============================================
    // RENDERING - Large central eye, stretchy legs
    // ============================================
    
    renderLegs(ctx, x, y, s) {
        const stretch = this.legStretch;
        const stiffness = this.bodyStiffness;
        
        ctx.strokeStyle = '#4b0082'; // Indigo/Purple
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 4; i++) {
            // Reduce animation when stiff
            const animSpeed = 1 - stiffness * 0.8;
            const angle = (i / 4) * Math.PI * 2 + this.tentaclePhase * animSpeed;
            const tentacleX = x + Math.cos(angle) * (s / 2);
            const tentacleY = y + s / 3;
            
            // Stretch legs when unseen
            const legLength = 15 * stretch;
            const endX = tentacleX + Math.cos(angle + Math.sin(this.tentaclePhase * animSpeed + i)) * legLength;
            const endY = tentacleY + (10 + Math.sin(this.tentaclePhase * 2 * animSpeed + i) * 5) * stretch;
            
            ctx.beginPath();
            ctx.moveTo(tentacleX, tentacleY);
            ctx.quadraticCurveTo(
                tentacleX + (endX - tentacleX) / 2,
                tentacleY + 15 * stretch,
                endX,
                endY
            );
            ctx.stroke();
        }
    }
    
    renderBody(ctx, x, y, s) {
        // Body becomes more rigid when watched
        const stiffness = this.bodyStiffness;
        
        // Darker purple when stiff
        const r = Math.floor(148 - stiffness * 50);
        const g = Math.floor(0 - stiffness * 0);
        const b = Math.floor(211 - stiffness * 60);
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.strokeStyle = '#4b0082';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2 + 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner glow (dimmer when stiff)
        const glowAlpha = 0.3 * (1 - stiffness * 0.5);
        const gradient = ctx.createRadialGradient(x, y - 5, 0, x, y, s / 2);
        gradient.addColorStop(0, `rgba(180, 50, 255, ${glowAlpha})`);
        gradient.addColorStop(1, 'rgba(75, 0, 130, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderEyes(ctx, x, y, s) {
        // Large central eye that tracks player
        const eyeSize = 14; // Larger than base
        
        // Eye white
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, eyeSize, eyeSize * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupil - larger, more menacing
        const pupilSize = 7;
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x * 1.2, y - 2 + this.eyeOffset.y * 1.2, pupilSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Purple iris ring
        ctx.strokeStyle = 'rgba(128, 0, 128, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x * 1.2, y - 2 + this.eyeOffset.y * 1.2, pupilSize + 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Eye shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x - 3, y - 5 + this.eyeOffset.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}
