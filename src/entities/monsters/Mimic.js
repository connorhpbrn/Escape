import { BaseMonster } from './BaseMonster.js';
import { CONFIG } from '../../main.js';
import { distance } from '../../world/Collision.js';

// ============================================
// MIMIC - Movement-copy Monster
// Records player movement and replays it
// ============================================

// Tuning constants
const MIMIC_RECORD_DURATION = 3.0;      // Seconds of movement to record
const MIMIC_RECORD_INTERVAL = 0.1;      // How often to record positions
const MIMIC_REPLAY_SPEED = 1.2;         // Speed multiplier during replay
const MIMIC_STOP_THRESHOLD = 0.5;       // Seconds player must stop to trigger replay
const MIMIC_BLINK_OFFSET = 0.3;         // Eye blink timing offset from player

export class Mimic extends BaseMonster {
    constructor(x, y, map) {
        super(x, y, map);
        
        this.name = 'Mimic';
        this.description = 'Copies your movements when you stop';
        
        // Movement recording
        this.recordedPath = [];          // { x, y, timestamp }
        this.recordTimer = 0;
        this.maxRecordedPoints = Math.floor(MIMIC_RECORD_DURATION / MIMIC_RECORD_INTERVAL);
        
        // Replay state
        this.isReplaying = false;
        this.replayIndex = 0;
        this.replayStartPos = null;
        
        // Player stop detection
        this.playerStopTimer = 0;
        this.lastPlayerPos = null;
        
        // Visual state
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.distortionPhase = 0;
    }
    
    preUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer) {
        this.distortionPhase += deltaTime * 2;
        
        // Update blink (slightly out of sync with player)
        this.blinkTimer += deltaTime;
        if (this.blinkTimer >= 3 + MIMIC_BLINK_OFFSET) {
            this.isBlinking = true;
            if (this.blinkTimer >= 3.15 + MIMIC_BLINK_OFFSET) {
                this.isBlinking = false;
                this.blinkTimer = 0;
            }
        }
        
        // Check if player is moving
        const playerMoving = Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1;
        
        if (playerMoving) {
            // Player is moving - record their path
            this.playerStopTimer = 0;
            this.isReplaying = false;
            
            this.recordTimer += deltaTime;
            if (this.recordTimer >= MIMIC_RECORD_INTERVAL) {
                this.recordTimer = 0;
                
                // Add position to recorded path
                this.recordedPath.push({
                    x: player.x,
                    y: player.y,
                    timestamp: performance.now()
                });
                
                // Keep only recent positions
                if (this.recordedPath.length > this.maxRecordedPoints) {
                    this.recordedPath.shift();
                }
            }
            
            this.lastPlayerPos = { x: player.x, y: player.y };
        } else {
            // Player stopped
            this.playerStopTimer += deltaTime;
            
            // Trigger replay after threshold
            if (this.playerStopTimer >= MIMIC_STOP_THRESHOLD && 
                this.recordedPath.length > 0 && 
                !this.isReplaying) {
                this.startReplay();
            }
        }
    }
    
    startReplay() {
        if (this.recordedPath.length < 2) return;
        
        this.isReplaying = true;
        this.replayIndex = 0;
        this.replayStartPos = { x: this.x, y: this.y };
    }
    
    postUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer) {
        // Handle replay movement
        if (this.isReplaying && this.recordedPath.length > 0) {
            // Override normal movement during replay
            if (this.replayIndex < this.recordedPath.length) {
                const targetPoint = this.recordedPath[this.replayIndex];
                const dx = targetPoint.x - this.x;
                const dy = targetPoint.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 20) {
                    this.replayIndex++;
                }
            } else {
                // Replay finished - clear and resume normal chase
                this.isReplaying = false;
                this.recordedPath = [];
            }
        }
    }
    
    // Override target during replay
    updateStateMachine(deltaTime, player, hasLOS, distToPlayer) {
        if (this.isReplaying && this.replayIndex < this.recordedPath.length) {
            // Follow recorded path
            this.target = this.recordedPath[this.replayIndex];
            this.state = 'chase';
        } else {
            // Normal behaviour
            super.updateStateMachine(deltaTime, player, hasLOS, distToPlayer);
        }
    }
    
    getCurrentSpeed() {
        if (this.isReplaying) {
            return this.speed * MIMIC_REPLAY_SPEED;
        }
        return this.speed;
    }
    
    // ============================================
    // RENDERING - Player-like but distorted
    // ============================================
    
    renderLegs(ctx, x, y, s) {
        // Legs that mirror player movement style
        const distortion = Math.sin(this.distortionPhase) * 0.1;
        
        ctx.strokeStyle = '#808000'; // Olive/Dark Yellow
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.tentaclePhase;
            const tentacleX = x + Math.cos(angle) * (s / 2);
            const tentacleY = y + s / 3;
            
            // Add distortion to movement
            const distortedAngle = angle + distortion;
            const endX = tentacleX + Math.cos(distortedAngle + Math.sin(this.tentaclePhase + i)) * 15;
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
    }
    
    renderBody(ctx, x, y, s) {
        // Slightly distorted body shape
        const distortion = Math.sin(this.distortionPhase * 1.5) * 2;
        
        // Muted yellow
        ctx.fillStyle = '#b3b300';
        ctx.strokeStyle = '#808000';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.ellipse(x + distortion * 0.5, y, s / 2 + 2, s / 2 + distortion * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Subtle inner pattern (mimicking player's body)
        const gradient = ctx.createRadialGradient(x, y - 5, 0, x, y, s / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 100, 0.2)');
        gradient.addColorStop(1, 'rgba(100, 100, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderEyes(ctx, x, y, s) {
        // Single eye like player, but slightly off
        const eyeY = y - 3;
        const distortion = Math.sin(this.distortionPhase * 2) * 1;
        
        if (!this.isBlinking) {
            // Eye white
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(x + distortion, eyeY, 9, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupil (tracks player like the Mimic is watching)
            ctx.fillStyle = '#2a2a2a';
            ctx.beginPath();
            ctx.arc(x + this.eyeOffset.x + distortion, eyeY + this.eyeOffset.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(x + this.eyeOffset.x - 2 + distortion, eyeY - 2 + this.eyeOffset.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Blinking - draw closed eye line
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 8 + distortion, eyeY);
            ctx.lineTo(x + 8 + distortion, eyeY);
            ctx.stroke();
        }
    }
    
    renderDebug(ctx, player) {
        super.renderDebug(ctx, player);
        
        // Draw recorded path
        if (this.recordedPath.length > 1) {
            ctx.strokeStyle = 'rgba(255, 100, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(this.recordedPath[0].x, this.recordedPath[0].y);
            
            for (let i = 1; i < this.recordedPath.length; i++) {
                ctx.lineTo(this.recordedPath[i].x, this.recordedPath[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Show replay state
        if (this.isReplaying) {
            ctx.fillStyle = '#f0f';
            ctx.font = '10px monospace';
            ctx.fillText('REPLAYING', this.x - 25, this.y - 55);
        }
    }
}
