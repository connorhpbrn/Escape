import { BaseMonster } from './BaseMonster.js';
import { CONFIG } from '../../main.js';
import { distance } from '../../world/Collision.js';

// ============================================
// FRACTURE - Splitting Monster
// Starts as one, splits into multiple smaller versions
// ============================================

// Tuning constants
const FRACTURE_MAX_COUNT = 4;           // Maximum total monsters
const FRACTURE_SPLIT_CHANCE = 0.02;     // Chance per second to split randomly
const FRACTURE_SPLIT_ON_GENERATOR = 0.7; // Chance to split when generator activates
const FRACTURE_SPLIT_ON_FAILED_CHASE = 0.4; // Chance to split after losing player
const FRACTURE_MIN_SIZE_RATIO = 0.6;    // Minimum size relative to original
const FRACTURE_SPEED_PER_SPLIT = 1.15;  // Speed multiplier per split level
const FRACTURE_CRACK_WARNING_TIME = 1.0; // Time cracks are visible before split

export class Fracture extends BaseMonster {
    constructor(x, y, map, splitLevel = 0, parentFractures = null) {
        super(x, y, map);
        
        this.name = 'Fracture';
        this.description = 'Splits into smaller, faster versions';
        
        // Split state
        this.splitLevel = splitLevel; // 0 = original, 1+ = split offspring
        this.parentFractures = parentFractures; // Reference to array of all fractures
        this.canSplit = splitLevel < 2; // Can only split twice (1 -> 2 -> 4)
        
        // Adjust size based on split level
        this.size = CONFIG.MONSTER_SIZE * Math.pow(0.8, splitLevel);
        this.baseSpeed = CONFIG.MONSTER_BASE_SPEED * Math.pow(FRACTURE_SPEED_PER_SPLIT, splitLevel);
        this.speed = this.baseSpeed;
        
        // Split warning
        this.crackProgress = 0; // 0-1, visible cracks before splitting
        this.isSplitting = false;
        this.splitTimer = 0;
        
        // Visual state
        this.crackLines = this.generateCrackPattern();
        this.twitchPhase = Math.random() * Math.PI * 2;
        this.particles = [];
    }
    
    generateCrackPattern() {
        // Generate random crack lines for visual effect
        const cracks = [];
        const numCracks = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numCracks; i++) {
            const angle = Math.random() * Math.PI * 2;
            const length = 0.3 + Math.random() * 0.4;
            cracks.push({ angle, length });
        }
        
        return cracks;
    }
    
    // Called when a generator is activated
    onGeneratorActivated() {
        if (this.canSplit && Math.random() < FRACTURE_SPLIT_ON_GENERATOR) {
            this.startSplit();
        }
    }
    
    // Override to potentially split on failed chase
    updateChaseState(deltaTime) {
        const wasChasing = this.state === 'chase';
        super.updateChaseState(deltaTime);
        
        // Check if we just lost the player
        if (wasChasing && this.state === 'search') {
            if (this.canSplit && Math.random() < FRACTURE_SPLIT_ON_FAILED_CHASE) {
                this.startSplit();
            }
        }
    }
    
    preUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer) {
        this.twitchPhase += deltaTime * (4 + this.splitLevel * 2);
        
        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime;
            return p.life > 0;
        });
        
        // Random split chance when under pressure (player nearby)
        if (this.canSplit && distToPlayer < 200) {
            if (Math.random() < FRACTURE_SPLIT_CHANCE * deltaTime) {
                this.startSplit();
            }
        }
        
        // Handle split animation
        if (this.isSplitting) {
            this.splitTimer += deltaTime;
            this.crackProgress = Math.min(1, this.splitTimer / FRACTURE_CRACK_WARNING_TIME);
            
            if (this.splitTimer >= FRACTURE_CRACK_WARNING_TIME) {
                this.completeSplit();
            }
        }
    }
    
    startSplit() {
        if (!this.canSplit || this.isSplitting) return;
        
        // Check total count
        if (this.parentFractures && this.parentFractures.length >= FRACTURE_MAX_COUNT) return;
        
        this.isSplitting = true;
        this.splitTimer = 0;
        this.crackProgress = 0;
    }
    
    completeSplit() {
        if (!this.parentFractures) return;
        
        // Create new fracture offset from current position
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = 20;
        
        const newX = this.x + Math.cos(offsetAngle) * offsetDist;
        const newY = this.y + Math.sin(offsetAngle) * offsetDist;
        
        // Create offspring
        const offspring = new Fracture(
            newX, newY, 
            this.map, 
            this.splitLevel + 1,
            this.parentFractures
        );
        offspring.generatorsActivated = this.generatorsActivated;
        offspring.speed = offspring.baseSpeed + this.generatorsActivated * CONFIG.MONSTER_SPEED_INCREMENT;
        
        // Add to parent array
        this.parentFractures.push(offspring);
        
        // This one also becomes smaller
        this.splitLevel++;
        this.size = CONFIG.MONSTER_SIZE * Math.pow(0.8, this.splitLevel);
        this.baseSpeed = CONFIG.MONSTER_BASE_SPEED * Math.pow(FRACTURE_SPEED_PER_SPLIT, this.splitLevel);
        this.speed = this.baseSpeed + this.generatorsActivated * CONFIG.MONSTER_SPEED_INCREMENT;
        this.canSplit = this.splitLevel < 2;
        
        // Move this one in opposite direction
        this.x -= Math.cos(offsetAngle) * offsetDist;
        this.y -= Math.sin(offsetAngle) * offsetDist;
        
        // Reset split state
        this.isSplitting = false;
        this.splitTimer = 0;
        this.crackProgress = 0;
        this.crackLines = this.generateCrackPattern();
        
        // Spawn blue particles
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 1.0,
                size: 2 + Math.random() * 3,
                color: 'rgba(0, 136, 255, 1)' // Bright Blue
            });
        }
    }
    
    // Smaller versions are less predictive
    getPredictedTarget(player) {
        if (this.splitLevel > 0) {
            // Less prediction for smaller versions
            const leadTime = CONFIG.MONSTER_LEAD_TIME * (1 - this.splitLevel * 0.3);
            const predictedX = player.x + player.vx * leadTime * 60;
            const predictedY = player.y + player.vy * leadTime * 60;
            
            const predictedTile = this.map.worldToTile(predictedX, predictedY);
            if (this.map.isWalkable(predictedTile.x, predictedTile.y)) {
                return { x: predictedX, y: predictedY };
            }
        }
        return super.getPredictedTarget(player);
    }
    
    // ============================================
    // RENDERING - Crack lines, twitchy movement
    // ============================================
    
    render(ctx) {
        const x = this.x;
        const y = this.y + this.pulseOffset;
        const s = this.size;
        
        // Shadow
        this.renderShadow(ctx, x, y, s);
        
        // Legs (twitchier for smaller versions)
        this.renderLegs(ctx, x, y, s);
        
        // Body with cracks
        this.renderBody(ctx, x, y, s);
        
        // Crack lines (if splitting)
        if (this.crackProgress > 0) {
            this.renderCracks(ctx, x, y, s);
        }
        
        // Eyes
        this.renderEyes(ctx, x, y, s);
        
        // Render particles
        for (const p of this.particles) {
            ctx.fillStyle = p.color.replace('1)', `${p.life / p.maxLife})`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderShadow(ctx, x, y, s) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, this.y + s / 2 + 3, s / 2 + 2, s / 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderLegs(ctx, x, y, s) {
        // Twitchier legs for smaller versions
        const twitch = Math.sin(this.twitchPhase) * (1 + this.splitLevel * 0.5);
        
        // Legs match body color (Lighter Blue)
        // Calculate same color as body
        const r = 100 - this.splitLevel * 20;
        const g = 149 - this.splitLevel * 20;
        const b = 237 - this.splitLevel * 20; // Cornflower blue base
        
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = Math.max(2, 4 - this.splitLevel);
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.tentaclePhase + twitch * 0.1;
            const tentacleX = x + Math.cos(angle) * (s / 2);
            const tentacleY = y + s / 3;
            
            const legLength = (15 - this.splitLevel * 3) * (s / CONFIG.MONSTER_SIZE);
            const endX = tentacleX + Math.cos(angle + Math.sin(this.tentaclePhase + i) + twitch * 0.2) * legLength;
            const endY = tentacleY + (10 + Math.sin(this.tentaclePhase * 2 + i) * 5) * (s / CONFIG.MONSTER_SIZE);
            
            ctx.beginPath();
            ctx.moveTo(tentacleX, tentacleY);
            ctx.quadraticCurveTo(
                tentacleX + (endX - tentacleX) / 2,
                tentacleY + 15 * (s / CONFIG.MONSTER_SIZE),
                endX,
                endY
            );
            ctx.stroke();
        }
    }
    
    renderBody(ctx, x, y, s) {
        // Body color varies with split level (Lighter Blue)
        const r = 100 - this.splitLevel * 20;
        const g = 149 - this.splitLevel * 20;
        const b = 237 - this.splitLevel * 20; // Cornflower blue base
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.strokeStyle = `rgb(${Math.max(0, r-50)}, ${Math.max(0, g-50)}, ${Math.max(0, b-50)})`;
        ctx.lineWidth = Math.max(1.5, 3 - this.splitLevel * 0.5);
        
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2 + 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner glow
        const gradient = ctx.createRadialGradient(x, y - 5 * (s / CONFIG.MONSTER_SIZE), 0, x, y, s / 2);
        gradient.addColorStop(0, 'rgba(200, 220, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 139, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderCracks(ctx, x, y, s) {
        ctx.strokeStyle = `rgba(255, 200, 100, ${this.crackProgress})`;
        ctx.lineWidth = 2;
        
        for (const crack of this.crackLines) {
            const startX = x;
            const startY = y;
            const endX = x + Math.cos(crack.angle) * s * crack.length * this.crackProgress;
            const endY = y + Math.sin(crack.angle) * s * crack.length * this.crackProgress;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Glow effect
            ctx.strokeStyle = `rgba(255, 150, 50, ${this.crackProgress * 0.5})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            ctx.strokeStyle = `rgba(255, 200, 100, ${this.crackProgress})`;
            ctx.lineWidth = 2;
        }
    }
    
    renderEyes(ctx, x, y, s) {
        const eyeScale = s / CONFIG.MONSTER_SIZE;
        const eyeY = y - 3 * eyeScale;
        
        // Eye white
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, eyeY, 10 * eyeScale, 8 * eyeScale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupil
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x * eyeScale, eyeY + this.eyeOffset.y * eyeScale, 5 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x * eyeScale - 2, eyeY - 2 * eyeScale + this.eyeOffset.y * eyeScale, 2 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderDebug(ctx, player) {
        super.renderDebug(ctx, player);
        
        // Show split level
        ctx.fillStyle = '#ff0';
        ctx.font = '10px monospace';
        ctx.fillText(`Split: ${this.splitLevel}`, this.x - 15, this.y - 55);
        
        if (this.isSplitting) {
            ctx.fillText(`SPLITTING: ${(this.crackProgress * 100).toFixed(0)}%`, this.x - 30, this.y - 65);
        }
    }
}
