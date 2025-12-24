import { BaseMonster } from './BaseMonster.js';
import { CONFIG } from '../../main.js';
import { distance } from '../../world/Collision.js';

// ============================================
// ECHO - Sound-based Monster
// Tracks sound events, not vision
// ============================================

// Tuning constants
const ECHO_HEARING_RANGE = 500;        // Extended hearing range
const ECHO_SOUND_MEMORY = 6.0;         // How long sound pulses are remembered

// Sound priority hierarchy (higher = more important)
const SOUND_PRIORITY = {
    GENERATOR_ACTIVE: 10,   // Generator being activated (holding E)
    EXIT_OPEN: 9,           // Exit unlocking
    GENERATOR_COMPLETE: 8,  // Generator finished
    DOOR_CLOSE: 6,          // Door closing
    FOOTSTEP: 3,            // Player footsteps
    FOOTSTEP_SPRINT: 5      // Player sprinting
};

// Intensity multipliers
const ECHO_GENERATOR_INTENSITY = 2.0;
const ECHO_EXIT_INTENSITY = 2.5;
const ECHO_DOOR_INTENSITY = 1.5;
const ECHO_FOOTSTEP_INTENSITY = 0.6;
const ECHO_SPRINT_INTENSITY = 1.0;

export class Echo extends BaseMonster {
    constructor(x, y, map) {
        super(x, y, map);
        
        this.name = 'Echo';
        this.description = 'Hunts by sound';
        
        // Sound tracking - { x, y, intensity, priority, timer, type }
        this.soundPulses = [];
        this.currentTarget = null;
        this.footstepTimer = 0;
        
        // Visual state
        this.pulseRings = [];
        this.detectionPulse = 0;
        this.bodyPulsePhase = 0;
    }
    
    getHearingRange() {
        return ECHO_HEARING_RANGE;
    }
    
    // Add a sound event with priority
    addSound(x, y, type, priority, intensity) {
        const dist = distance(this.x, this.y, x, y);
        if (dist > ECHO_HEARING_RANGE) return;
        
        const distFactor = 1 - (dist / ECHO_HEARING_RANGE);
        this.soundPulses.push({
            x, y,
            type,
            priority,
            intensity: distFactor * intensity,
            timer: ECHO_SOUND_MEMORY
        });
        
        // Visual feedback
        this.detectionPulse = Math.min(1, this.detectionPulse + 0.3);
        this.pulseRings.push({ x: this.x, y: this.y, radius: 0, alpha: 0.6 });
        
        // Always investigate sounds
        if (this.state !== 'chase') {
            this.state = 'investigate';
        }
        this.updateSoundTarget();
    }
    
    // Called from BaseMonster.onNoiseEvent (generator complete)
    handleNoiseEvent(x, y, dist) {
        this.addSound(x, y, 'generator_complete', SOUND_PRIORITY.GENERATOR_COMPLETE, ECHO_GENERATOR_INTENSITY);
    }
    
    // Called when generator is being activated (holding E)
    onGeneratorActivating(genX, genY) {
        this.addSound(genX, genY, 'generator_active', SOUND_PRIORITY.GENERATOR_ACTIVE, ECHO_GENERATOR_INTENSITY * 1.2);
    }
    
    // Called when exit opens
    onExitOpen(exitX, exitY) {
        this.addSound(exitX, exitY, 'exit_open', SOUND_PRIORITY.EXIT_OPEN, ECHO_EXIT_INTENSITY);
    }
    
    // Called when door closes
    onDoorClose(doorX, doorY) {
        this.addSound(doorX, doorY, 'door_close', SOUND_PRIORITY.DOOR_CLOSE, ECHO_DOOR_INTENSITY);
    }
    
    // Called when player moves (footsteps)
    onPlayerFootstep(playerX, playerY, isSprinting, loudnessMultiplier = 1.0) {
        const priority = isSprinting ? SOUND_PRIORITY.FOOTSTEP_SPRINT : SOUND_PRIORITY.FOOTSTEP;
        const baseIntensity = isSprinting ? ECHO_SPRINT_INTENSITY : ECHO_FOOTSTEP_INTENSITY;
        // Apply loudness multiplier (e.g., from Surge ability)
        const intensity = baseIntensity * loudnessMultiplier;
        this.addSound(playerX, playerY, 'footstep', priority, intensity);
    }
    
    updateSoundTarget() {
        // Find highest priority sound, then loudest within that priority
        let best = null;
        let bestScore = -1;
        
        for (const pulse of this.soundPulses) {
            // Score = priority * 100 + intensity * freshness
            const freshness = pulse.timer / ECHO_SOUND_MEMORY;
            const score = pulse.priority * 100 + pulse.intensity * freshness * 10;
            
            if (score > bestScore) {
                bestScore = score;
                best = pulse;
            }
        }
        
        if (best) {
            this.currentTarget = { x: best.x, y: best.y };
            this.investigatePosition = this.currentTarget;
            this.investigateTimer = Math.max(2, best.timer);
        }
    }
    
    preUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer) {
        // Update sound pulses
        this.soundPulses = this.soundPulses.filter(pulse => {
            pulse.timer -= deltaTime;
            return pulse.timer > 0;
        });
        
        // Update visual pulses
        this.detectionPulse = Math.max(0, this.detectionPulse - deltaTime * 2);
        this.bodyPulsePhase += deltaTime * 3;
        
        // Update pulse rings
        this.pulseRings = this.pulseRings.filter(ring => {
            ring.radius += deltaTime * 100;
            ring.alpha -= deltaTime * 1.5;
            return ring.alpha > 0;
        });
        
        // Periodic detection pulse when investigating
        if (this.state === 'investigate' && Math.random() < deltaTime * 2) {
            this.pulseRings.push({ x: this.x, y: this.y, radius: 0, alpha: 0.4 });
        }
        
        // Update target based on sounds
        if (this.soundPulses.length > 0) {
            this.updateSoundTarget();
        }
    }
    
    // Resonant doesn't use vision for chasing
    shouldChasePlayer(hasLOS, distToPlayer) {
        // Only "chase" if there are active sound pulses near player
        return false; // Relies on investigate state instead
    }
    
    updatePatrolState() {
        // More active patrol - wander towards areas with old sounds
        this.state = 'patrol';
        if (!this.target || distance(this.x, this.y, this.target.x, this.target.y) < 30) {
            this.target = this.getRandomPatrolPoint();
        }
    }
    
    // ============================================
    // RENDERING - No eyes, ring patterns
    // ============================================
    
    render(ctx) {
        const x = this.x;
        const y = this.y + this.pulseOffset;
        const s = this.size;
        
        // Render detection pulse rings
        for (const ring of this.pulseRings) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${ring.alpha})`; // White rings
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Shadow
        this.renderShadow(ctx, x, y, s);
        
        // Legs
        this.renderLegs(ctx, x, y, s);
        
        // Body
        this.renderBody(ctx, x, y, s);
        
        // No eyes - render sensor patterns instead
        this.renderSensorPatterns(ctx, x, y, s);
    }
    
    renderLegs(ctx, x, y, s) {
        // Orange tint
        ctx.strokeStyle = '#b34700'; // Dark Orange
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
    }
    
    renderBody(ctx, x, y, s) {
        // Orange body
        ctx.fillStyle = '#e65c00';
        ctx.strokeStyle = '#993d00';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2 + 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Pulsing inner glow synced to detection
        const pulseIntensity = 0.2 + this.detectionPulse * 0.4 + Math.sin(this.bodyPulsePhase) * 0.1;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, s / 2);
        gradient.addColorStop(0, `rgba(255, 200, 100, ${pulseIntensity})`);
        gradient.addColorStop(1, 'rgba(150, 80, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderSensorPatterns(ctx, x, y, s) {
        // Concentric ring patterns instead of eyes
        const ringCount = 3;
        const maxRadius = s / 3;
        const pulseOffset = Math.sin(this.bodyPulsePhase) * 2;
        
        for (let i = 0; i < ringCount; i++) {
            const radius = (maxRadius / ringCount) * (i + 1) + pulseOffset * (i * 0.3);
            const alpha = 0.3 + this.detectionPulse * 0.4 - i * 0.1;
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`; // White sensor rings
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y - 2, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Central sensor dot
        const dotPulse = 0.5 + this.detectionPulse * 0.5 + Math.sin(this.bodyPulsePhase * 2) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${dotPulse})`; // White center dot
        ctx.beginPath();
        ctx.arc(x, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
