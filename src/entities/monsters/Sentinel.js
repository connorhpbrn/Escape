import { BaseMonster } from './BaseMonster.js';
import { CONFIG } from '../../main.js';
import { distance } from '../../world/Collision.js';

// ============================================
// SENTINEL - Door Smasher & Exit Guardian
// Chases player normally, smashes closed doors, guards exit when unlocked
// ============================================

// Tuning constants
const SENTINEL_SIZE_MULTIPLIER = 1.0;   // Regular size to avoid getting stuck
const SENTINEL_SMASH_RANGE = 50;        // Range to detect and smash doors
const SENTINEL_SMASH_COOLDOWN = 1.0;    // Cooldown between smashes
const SENTINEL_SHAKE_INTENSITY = 4;     // Screen shake when smashing
const SENTINEL_GUARD_RADIUS = 80;       // How close to exit to start guarding
const SENTINEL_PATROL_RADIUS = 120;     // Patrol radius around exit when guarding
const SENTINEL_WALL_BREAK_COOLDOWN = 2.0; // Cooldown between wall breaks
const SENTINEL_STUCK_TIME = 1.0;        // Time before considered stuck

// Anger system constants
const ANGER_BUILD_RATE = 0.08;          // How fast anger builds when seeing player
const ANGER_DECAY_RATE = 0.02;          // How fast anger decays when not seeing player
const ANGER_STAGE_1 = 0.0;              // Stage 1: Can break doors (starts here)
const ANGER_STAGE_2 = 0.4;              // Stage 2: Can break 1 wall tile
const ANGER_STAGE_3 = 0.75;             // Stage 3: Can break 2 wall tiles
const ANGER_MAX = 1.0;

// Speed multipliers based on anger
const SPEED_MIN = 0.9;                  // Speed at 0 anger
const SPEED_MAX = 1.4;                  // Speed at max anger
const GUARD_SPEED = 0.7;                // Speed when guarding

export class Sentinel extends BaseMonster {
    constructor(x, y, map, game = null) {
        super(x, y, map);
        
        this.name = 'Sentinel';
        this.description = 'Smashes doors, guards the exit';
        
        this.game = game; // Reference for screen shake
        
        // Larger size
        this.size = CONFIG.MONSTER_SIZE * SENTINEL_SIZE_MULTIPLIER;
        
        // Sentinel state: 'chase' or 'guard'
        this.sentinelState = 'chase';
        
        // Door smashing
        this.smashCooldown = 0;
        this.isSmashing = false;
        this.smashProgress = 0;
        
        // Exit guarding
        this.exitPosition = null;
        this.exitUnlocked = false;
        this.isGuarding = false;
        this.patrolAngle = 0;
        
        // Visual state
        this.eyeGlowIntensity = 0.7;
        this.extraLegsPhase = 0;
        
        // Anger system (0 = calm/white, 1 = max anger/red)
        this.anger = 0;
        this.angerStage = 1; // 1, 2, or 3
        
        // Guard mode color transition (0 = normal, 1 = full green)
        this.guardTransition = 0;
        
        // Wall breaking
        this.wallBreakCooldown = 0;
        this.stuckTimer = 0;
        this.lastPosition = { x: x, y: y };
        
        // Debris particles
        this.debrisParticles = [];
    }
    
    // Set the exit position for guarding
    setExitPosition(exitX, exitY) {
        this.exitPosition = { x: exitX, y: exitY };
    }
    
    // Called when exit is unlocked (all generators activated)
    onExitUnlocked() {
        this.exitUnlocked = true;
        this.sentinelState = 'guard';
        this.isGuarding = false; // Will become true when reaching exit
        // Immediately stop chasing and head to exit
        this.lastSeenPosition = null;
        this.lastSeenTimer = 0;
    }
    
    preUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer) {
        this.extraLegsPhase += deltaTime * 2;
        this.patrolAngle += deltaTime * 0.5; // Slower patrol
        
        // Update smash cooldown
        if (this.smashCooldown > 0) {
            this.smashCooldown -= deltaTime;
        }
        
        // Update wall break cooldown
        if (this.wallBreakCooldown > 0) {
            this.wallBreakCooldown -= deltaTime;
        }
        
        // Update smash animation
        if (this.isSmashing) {
            this.smashProgress += deltaTime * 4;
            if (this.smashProgress >= 1) {
                this.isSmashing = false;
                this.smashProgress = 0;
            }
        }
        
        // Update debris particles
        this.debrisParticles = this.debrisParticles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += 300 * deltaTime; // gravity
            p.rotation += p.rotSpeed * deltaTime;
            p.life -= deltaTime;
            return p.life > 0;
        });
        
        // Update anger system (only when chasing)
        if (this.sentinelState === 'chase') {
            if (hasLOS) {
                // Build anger when seeing player
                this.anger = Math.min(ANGER_MAX, this.anger + ANGER_BUILD_RATE * deltaTime);
            } else {
                // Slowly decay anger when not seeing player
                this.anger = Math.max(0, this.anger - ANGER_DECAY_RATE * deltaTime);
            }
            
            // Update anger stage
            if (this.anger >= ANGER_STAGE_3) {
                this.angerStage = 3;
            } else if (this.anger >= ANGER_STAGE_2) {
                this.angerStage = 2;
            } else {
                this.angerStage = 1;
            }
            
            // Reset guard transition when chasing
            this.guardTransition = Math.max(0, this.guardTransition - deltaTime * 0.5);
        } else {
            // In guard mode, transition to green and calm down
            this.guardTransition = Math.min(1, this.guardTransition + deltaTime * 0.3);
            this.anger = Math.max(0, this.anger - ANGER_DECAY_RATE * 2 * deltaTime);
        }
        
        // Check if stuck (not moving much)
        const movedDist = distance(this.x, this.y, this.lastPosition.x, this.lastPosition.y);
        if (movedDist < 5 && this.sentinelState === 'chase') {
            this.stuckTimer += deltaTime;
        } else {
            this.stuckTimer = 0;
        }
        this.lastPosition = { x: this.x, y: this.y };
        
        // State-specific behaviour (skip if lured to decoy)
        if (this.state === 'decoy' && this.decoyTarget) {
            // Decoy takes priority - handled by state machine
            return;
        }
        
        if (this.sentinelState === 'guard') {
            this.updateGuardBehaviour(deltaTime, player, hasLOS, distToPlayer);
        } else {
            this.updateChaseBehaviour(deltaTime, player, hasLOS, distToPlayer);
        }
        
        // Eye glow based on anger
        if (this.isSmashing) {
            this.eyeGlowIntensity = 1.0;
        } else if (this.isGuarding) {
            this.eyeGlowIntensity = 0.5 + Math.sin(this.extraLegsPhase) * 0.1;
        } else {
            this.eyeGlowIntensity = 0.8;
        }
    }
    
    updateChaseBehaviour(deltaTime, player, hasLOS, distToPlayer) {
        // If player is hiding, lose track and patrol
        if (player.isHiding) {
            this.lastSeenPosition = null;
            this.lastSeenTimer = 0;
            // Get a random patrol point instead
            this.target = this.getRandomPatrolPoint();
            return;
        }
        
        // Only chase if we can actually see the player
        if (hasLOS && distToPlayer <= CONFIG.MONSTER_LOS_DISTANCE) {
            this.target = { x: player.x, y: player.y };
            this.lastSeenPosition = { x: player.x, y: player.y };
            this.lastSeenTimer = CONFIG.MONSTER_MEMORY_DURATION;
        } else if (this.lastSeenPosition && this.lastSeenTimer > 0) {
            // Go to last seen position
            this.target = this.lastSeenPosition;
            this.lastSeenTimer -= deltaTime;
        } else {
            // Lost the player, patrol randomly
            this.target = this.getRandomPatrolPoint();
        }
    }
    
    updateGuardBehaviour(deltaTime, player, hasLOS, distToPlayer) {
        if (!this.exitPosition) {
            // No exit set, just chase
            this.target = { x: player.x, y: player.y };
            return;
        }
        
        // If we can see the player, chase them temporarily
        if (hasLOS && distToPlayer <= CONFIG.MONSTER_LOS_DISTANCE) {
            this.target = { x: player.x, y: player.y };
            this.isGuarding = false; // Temporarily leave guard post
            return;
        }
        
        const distToExit = distance(this.x, this.y, this.exitPosition.x, this.exitPosition.y);
        
        if (!this.isGuarding) {
            // Moving to exit (or returning after chasing player)
            this.target = { x: this.exitPosition.x, y: this.exitPosition.y };
            
            // Check if reached exit
            if (distToExit < SENTINEL_GUARD_RADIUS) {
                this.isGuarding = true;
                this.patrolAngle = Math.random() * Math.PI * 2; // Randomize starting angle
            }
        } else {
            // Guarding - patrol around exit using valid walkable points
            this.updatePatrolTarget();
        }
    }
    
    updatePatrolTarget() {
        // Try to find a walkable patrol point around the exit
        const maxAttempts = 8;
        
        for (let i = 0; i < maxAttempts; i++) {
            const testAngle = this.patrolAngle + (i * Math.PI * 2 / maxAttempts);
            const patrolX = this.exitPosition.x + Math.cos(testAngle) * SENTINEL_PATROL_RADIUS;
            const patrolY = this.exitPosition.y + Math.sin(testAngle) * SENTINEL_PATROL_RADIUS;
            
            const tile = this.map.worldToTile(patrolX, patrolY);
            if (this.map.isWalkable(tile.x, tile.y)) {
                this.target = { x: patrolX, y: patrolY };
                
                // Check if we're close to current patrol point, advance angle
                const distToPatrol = distance(this.x, this.y, patrolX, patrolY);
                if (distToPatrol < 30) {
                    this.patrolAngle += Math.PI / 4; // Advance to next patrol point
                }
                return;
            }
        }
        
        // Fallback: stay at exit if no walkable patrol points
        this.target = { x: this.exitPosition.x, y: this.exitPosition.y };
    }
    
    // Override update to check for doors to smash and walls to break
    update(deltaTime, player, doors, decoys) {
        // Check for closed doors to smash
        if (this.smashCooldown <= 0 && !this.isSmashing) {
            for (const door of doors) {
                if (door.isClosed && !door.isDestroyed) {
                    const distToDoor = distance(this.x, this.y, door.x, door.y);
                    if (distToDoor < SENTINEL_SMASH_RANGE) {
                        this.smashDoor(door);
                        break;
                    }
                }
            }
        }
        
        // Check for wall breaking when stuck (only at stage 2+)
        if (this.stuckTimer >= SENTINEL_STUCK_TIME && 
            this.wallBreakCooldown <= 0 && 
            !this.isSmashing &&
            this.angerStage >= 2) {
            this.tryBreakWall(player);
        }
        
        // Call parent update
        super.update(deltaTime, player, doors, decoys);
    }
    
    tryBreakWall(player) {
        const tile = this.map.worldToTile(this.x, this.y);
        
        // Find direction towards player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        
        // Primary direction
        const primaryDir = { 
            x: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : 0,
            y: Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 1 : -1) : 0
        };
        
        // Check adjacent tiles in the direction of the player
        const checkDirs = [primaryDir];
        if (primaryDir.x !== 0 && primaryDir.y === 0) {
            checkDirs.push({ x: primaryDir.x, y: 1 });
            checkDirs.push({ x: primaryDir.x, y: -1 });
        } else if (primaryDir.y !== 0 && primaryDir.x === 0) {
            checkDirs.push({ x: 1, y: primaryDir.y });
            checkDirs.push({ x: -1, y: primaryDir.y });
        }
        
        for (const dir of checkDirs) {
            const checkX = tile.x + dir.x;
            const checkY = tile.y + dir.y;
            
            // Only break regular walls (not outer boundary)
            if (checkX > 1 && checkX < this.map.width - 2 && 
                checkY > 1 && checkY < this.map.height - 2 &&
                this.map.data[checkY][checkX] === 1) {
                
                // Break wall(s) based on anger stage
                const wallsToBreak = this.angerStage >= 3 ? 2 : 1;
                this.breakWalls(checkX, checkY, dir, wallsToBreak);
                break;
            }
        }
    }
    
    breakWalls(tileX, tileY, dir, count) {
        let wallsBroken = 0;
        
        for (let i = 0; i < count; i++) {
            const x = tileX + dir.x * i;
            const y = tileY + dir.y * i;
            
            // Check bounds and if it's a wall
            if (x > 1 && x < this.map.width - 2 && 
                y > 1 && y < this.map.height - 2 &&
                this.map.data[y][x] === 1) {
                
                // Convert wall to floor
                this.map.data[y][x] = 0;
                
                // Spawn debris at this wall location
                const worldPos = this.map.tileToWorld(x, y);
                this.spawnDebris(worldPos.x, worldPos.y, 15);
                
                wallsBroken++;
            } else {
                break; // Stop if we hit a non-wall
            }
        }
        
        if (wallsBroken > 0) {
            this.isSmashing = true;
            this.smashProgress = 0;
            this.wallBreakCooldown = SENTINEL_WALL_BREAK_COOLDOWN;
            this.stuckTimer = 0;
            
            // Screen shake based on walls broken
            if (this.game) {
                this.game.triggerScreenShake(SENTINEL_SHAKE_INTENSITY * (1 + wallsBroken * 0.5), 0.4);
            }
        }
    }
    
    smashDoor(door) {
        door.destroy();
        this.isSmashing = true;
        this.smashProgress = 0;
        this.smashCooldown = SENTINEL_SMASH_COOLDOWN;
        
        // Spawn debris particles for door
        this.spawnDebris(door.x, door.y, 8, '#0984e3');
        
        // Screen shake
        if (this.game) {
            this.game.triggerScreenShake(SENTINEL_SHAKE_INTENSITY, 0.3);
        }
    }
    
    spawnDebris(x, y, count, color = null) {
        // Use brighter, more visible colors for wall debris
        let debrisColor = color;
        if (!debrisColor) {
            // Make wall debris lighter/more visible
            const theme = this.map.theme;
            debrisColor = theme.wallHighlightColor || theme.wallBorderColor || '#6a6a7a';
        }
        
        for (let i = 0; i < count; i++) {
            this.debrisParticles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 200,
                vy: -80 - Math.random() * 120,
                size: 4 + Math.random() * 6,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 12,
                life: 0.8 + Math.random() * 0.5,
                maxLife: 1.3,
                color: debrisColor,
            });
        }
    }
    
    // Override lure to decoy - can be lured even when guarding
    lureToDecoy(decoy) {
        super.lureToDecoy(decoy);
        // Temporarily stop guarding to investigate decoy
        if (this.isGuarding) {
            this.isGuarding = false;
        }
    }
    
    // Override state machine - Sentinel uses its own targeting
    updateStateMachine(deltaTime, player, hasLOS, distToPlayer) {
        // Handle decoy state first (from BaseMonster)
        if (this.state === 'decoy' && this.decoyTarget) {
            this.target = { x: this.decoyTarget.x, y: this.decoyTarget.y };
            return;
        }
        
        // Normal Sentinel state
        this.state = this.isGuarding ? 'patrol' : 'chase';
    }
    
    getCurrentSpeed() {
        if (this.isSmashing) {
            return 0; // Stop while smashing
        }
        if (this.isGuarding) {
            return this.speed * GUARD_SPEED;
        }
        // Speed scales with anger
        const angerSpeedMult = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * this.anger;
        return this.speed * angerSpeedMult;
    }
    
    canKillPlayer() {
        return !this.isSmashing;
    }
    
    // ============================================
    // RENDERING - Larger body, extra legs, glowing eye
    // ============================================
    
    render(ctx) {
        // Render debris particles first (behind monster)
        this.renderDebris(ctx);
        
        const x = this.x;
        const y = this.y + this.pulseOffset;
        const s = this.size;
        
        ctx.save();
        
        // Smash animation - shake effect
        if (this.isSmashing) {
            const shakeX = (Math.random() - 0.5) * 6;
            const shakeY = (Math.random() - 0.5) * 6;
            ctx.translate(shakeX, shakeY);
        }
        
        // Shadow (larger)
        this.renderShadow(ctx, x, y, s);
        
        // Extra leg pairs
        this.renderExtraLegs(ctx, x, y, s);
        
        // Main legs
        this.renderLegs(ctx, x, y, s);
        
        // Body
        this.renderBody(ctx, x, y, s);
        
        // Glowing eye
        this.renderEyes(ctx, x, y, s);
        
        ctx.restore();
    }
    
    renderDebris(ctx) {
        for (const p of this.debrisParticles) {
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = alpha * 0.8;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        }
    }
    
    renderShadow(ctx, x, y, s) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x, this.y + s / 2 + 5, s / 2 + 5, s / 4 + 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Get current body color based on anger and guard state
    getBodyColor() {
        // Base: white/grey (200, 200, 200)
        // Angry: red (180, 40, 40)
        // Guard: green (40, 160, 80)
        
        if (this.guardTransition > 0) {
            // Transition to green when guarding
            const t = this.guardTransition;
            const baseR = 200 - this.anger * 160; // White to red
            const baseG = 200 - this.anger * 160;
            const baseB = 200 - this.anger * 160;
            
            const r = Math.floor(baseR * (1 - t) + 60 * t);
            const g = Math.floor(baseG * (1 - t) + 180 * t);
            const b = Math.floor(baseB * (1 - t) + 100 * t);
            return { r, g, b };
        }
        
        // Anger: white (200,200,200) -> red (180,40,40)
        const r = Math.floor(200 + (180 - 200) * this.anger);
        const g = Math.floor(200 - 160 * this.anger);
        const b = Math.floor(200 - 160 * this.anger);
        return { r, g, b };
    }
    
    getLegColor() {
        const body = this.getBodyColor();
        // Slightly darker than body
        return {
            r: Math.floor(body.r * 0.7),
            g: Math.floor(body.g * 0.7),
            b: Math.floor(body.b * 0.7)
        };
    }
    
    renderExtraLegs(ctx, x, y, s) {
        // Additional leg pairs for intimidation
        const legColor = this.getLegColor();
        ctx.strokeStyle = `rgb(${legColor.r}, ${legColor.g}, ${legColor.b})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // Back legs (longer, slower)
        for (let i = 0; i < 2; i++) {
            const angle = (i === 0 ? -0.3 : 0.3) + Math.PI + this.extraLegsPhase * 0.5;
            const tentacleX = x + Math.cos(angle) * (s / 2);
            const tentacleY = y + s / 4;
            const endX = tentacleX + Math.cos(angle + Math.sin(this.extraLegsPhase + i)) * 20;
            const endY = tentacleY + 15 + Math.sin(this.extraLegsPhase + i) * 4;
            
            ctx.beginPath();
            ctx.moveTo(tentacleX, tentacleY);
            ctx.quadraticCurveTo(
                tentacleX + (endX - tentacleX) / 2,
                tentacleY + 18,
                endX,
                endY
            );
            ctx.stroke();
        }
    }
    
    renderLegs(ctx, x, y, s) {
        const legColor = this.getLegColor();
        ctx.strokeStyle = `rgb(${legColor.r}, ${legColor.g}, ${legColor.b})`;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.tentaclePhase;
            const tentacleX = x + Math.cos(angle) * (s / 2);
            const tentacleY = y + s / 3;
            const endX = tentacleX + Math.cos(angle + Math.sin(this.tentaclePhase + i)) * 18;
            const endY = tentacleY + 12 + Math.sin(this.tentaclePhase * 2 + i) * 6;
            
            ctx.beginPath();
            ctx.moveTo(tentacleX, tentacleY);
            ctx.quadraticCurveTo(
                tentacleX + (endX - tentacleX) / 2,
                tentacleY + 18,
                endX,
                endY
            );
            ctx.stroke();
        }
    }
    
    renderBody(ctx, x, y, s) {
        const bodyColor = this.getBodyColor();
        const legColor = this.getLegColor();
        
        ctx.fillStyle = `rgb(${bodyColor.r}, ${bodyColor.g}, ${bodyColor.b})`;
        ctx.strokeStyle = `rgb(${legColor.r}, ${legColor.g}, ${legColor.b})`;
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2 + 3, s / 2 + 1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner glow based on anger/guard state
        const glowIntensity = this.eyeGlowIntensity;
        const gradient = ctx.createRadialGradient(x, y - 5, 0, x, y, s / 2);
        
        if (this.guardTransition > 0.5) {
            // Green glow when guarding
            gradient.addColorStop(0, `rgba(100, 255, 150, ${glowIntensity * 0.4})`);
            gradient.addColorStop(0.5, `rgba(50, 200, 100, ${glowIntensity * 0.2})`);
            gradient.addColorStop(1, 'rgba(30, 100, 50, 0)');
        } else {
            // Red glow based on anger
            const redIntensity = 50 + this.anger * 200;
            gradient.addColorStop(0, `rgba(${redIntensity}, 50, 50, ${glowIntensity * 0.5 * this.anger})`);
            gradient.addColorStop(0.5, `rgba(${redIntensity * 0.8}, 0, 0, ${glowIntensity * 0.3 * this.anger})`);
            gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderEyes(ctx, x, y, s) {
        const eyeScale = s / CONFIG.MONSTER_SIZE;
        const eyeY = y - 3 * eyeScale;
        const glowIntensity = this.eyeGlowIntensity;
        
        // Eye glow color based on state
        let glowR, glowG, glowB;
        if (this.guardTransition > 0.5) {
            // Green glow when guarding
            glowR = 100;
            glowG = 255;
            glowB = 150;
        } else {
            // Red glow based on anger
            glowR = 255;
            glowG = Math.floor(100 - this.anger * 80);
            glowB = Math.floor(100 - this.anger * 80);
        }
        
        ctx.shadowColor = `rgba(${glowR}, ${glowG}, ${glowB}, ${glowIntensity})`;
        ctx.shadowBlur = 15 * glowIntensity;
        
        // Eye white
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, eyeY, 12 * eyeScale, 10 * eyeScale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupil color based on state
        let pupilR, pupilG, pupilB;
        if (this.guardTransition > 0.5) {
            pupilR = 30;
            pupilG = 100;
            pupilB = 50;
        } else {
            pupilR = Math.floor(26 + this.anger * 100);
            pupilG = 26;
            pupilB = 26;
        }
        ctx.fillStyle = `rgb(${pupilR}, ${pupilG}, ${pupilB})`;
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x * eyeScale, eyeY + this.eyeOffset.y * eyeScale, 6 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x * eyeScale - 3, eyeY - 3 * eyeScale + this.eyeOffset.y * eyeScale, 2.5 * eyeScale, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderDebug(ctx, player) {
        super.renderDebug(ctx, player);
        
        // Show Sentinel state
        ctx.fillStyle = '#f00';
        ctx.font = '10px monospace';
        ctx.fillText(`State: ${this.sentinelState}`, this.x - 20, this.y - 55);
        ctx.fillText(`Anger: ${this.anger.toFixed(2)} (Stage ${this.angerStage})`, this.x - 40, this.y - 65);
        ctx.fillText(`Guard: ${this.guardTransition.toFixed(2)}`, this.x - 30, this.y - 75);
        
        if (this.isSmashing) {
            ctx.fillText('SMASHING!', this.x - 25, this.y - 85);
        }
    }
}
