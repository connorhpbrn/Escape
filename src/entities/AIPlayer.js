import { CONFIG } from '../main.js';
import { AStar } from '../world/Pathfinding.js';
import { distance } from '../world/Collision.js';
import { getAbilityTypes, getAbilityInfo } from './AbilityFactory.js';

// ============================================
// AI PLAYER - For Reverse Mode
// AI-controlled player that tries to activate generators and escape
// Has a random ability with cooldowns
// ============================================

export class AIPlayer {
    constructor(x, y, map) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PLAYER_SIZE;
        this.speed = CONFIG.PLAYER_SPEED;
        
        this.map = map;
        this.pathfinder = new AStar(map);
        this.path = [];
        this.pathUpdateTimer = 0;
        
        // AI State
        this.state = 'seek_generator';
        this.targetGenerator = null;
        this.panicTimer = 0;
        this.reachedExit = false;
        
        // Animation (match Player class)
        this.facingAngle = 0;
        this.bobPhase = 0;
        this.bobOffset = 0;
        
        // Dust particles for effects
        this.dustParticles = [];
        
        // References set by GameState
        this.generators = [];
        this.exit = null;
        this.monster = null;
        
        // Ability system - select random ability
        this.selectRandomAbility();
        
        // Active effects
        this.activeDecoy = null;
        this.barricades = [];
        this.isSurging = false;
        this.surgeTimer = 0;
        this.isDashing = false;
    }
    
    selectRandomAbility() {
        const types = getAbilityTypes();
        // Use proper uniform random selection
        const randomIndex = Math.floor(Math.random() * types.length);
        this.abilityType = types[randomIndex];
        this.abilityInfo = getAbilityInfo(this.abilityType);
        this.abilityCooldown = 0;
        this.abilityActive = false;
        this.abilityTimer = 0;
        
        // Debug log to verify randomness
        console.log(`AI Player ability: ${this.abilityType}`);
    }
    
    setReferences(generators, exit, monster) {
        this.generators = generators;
        this.exit = exit;
        this.monster = monster;
    }
    
    update(deltaTime) {
        this.bobPhase += deltaTime * 8;
        this.pathUpdateTimer -= deltaTime;
        
        // Update ability cooldown
        if (this.abilityCooldown > 0) {
            this.abilityCooldown -= deltaTime;
        }
        
        // Update dust particles
        this.dustParticles = this.dustParticles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += 30 * deltaTime; // gravity
            p.life -= deltaTime;
            return p.life > 0;
        });
        
        // Update active ability effects
        this.updateAbilityEffects(deltaTime);
        
        // Check if monster is close - panic!
        const distToMonster = this.monster ? distance(this.x, this.y, this.monster.x, this.monster.y) : Infinity;
        const monsterClose = distToMonster < 150;
        
        if (monsterClose) {
            this.panicTimer = 2.0;
            if (this.targetGenerator) {
                this.targetGenerator.cancelActivation();
            }
            this.state = 'flee';
            
            // Try to use ability when monster is close
            this.tryUseAbility();
        }
        
        if (this.panicTimer > 0) {
            this.panicTimer -= deltaTime;
        }
        
        // State machine
        switch (this.state) {
            case 'seek_generator':
                this.updateSeekGenerator(deltaTime);
                break;
            case 'activating':
                this.updateActivating(deltaTime);
                break;
            case 'flee':
                this.updateFlee(deltaTime);
                break;
            case 'seek_exit':
                this.updateSeekExit(deltaTime);
                break;
        }
    }
    
    updateAbilityEffects(deltaTime) {
        // Update decoy
        if (this.activeDecoy) {
            this.activeDecoy.timer -= deltaTime;
            if (this.activeDecoy.timer <= 0) {
                this.activeDecoy = null;
            }
        }
        
        // Update barricades - clear expired ones from map first
        for (const b of this.barricades) {
            b.timer -= deltaTime;
            if (b.timer <= 0 && this.map) {
                this.map.setTemporaryWall(b.tileX, b.tileY, false);
            }
        }
        this.barricades = this.barricades.filter(b => b.timer > 0);
        
        // Update surge
        if (this.isSurging) {
            this.surgeTimer -= deltaTime;
            if (this.surgeTimer <= 0) {
                this.isSurging = false;
            }
        }
    }
    
    tryUseAbility() {
        if (this.abilityCooldown > 0 || !this.abilityInfo) return;
        
        switch (this.abilityType) {
            case 'DECOY':
                this.useDecoy();
                break;
            case 'DASH':
                this.useDash();
                break;
            case 'BARRICADE':
                this.useBarricade();
                break;
            case 'SURGE':
                this.useSurge();
                break;
            case 'PULSE':
                // Pulse doesn't help AI much, skip
                break;
        }
    }
    
    useDecoy() {
        // Place decoy at current position
        this.activeDecoy = {
            x: this.x,
            y: this.y,
            timer: this.abilityInfo.duration,
            maxTimer: this.abilityInfo.duration
        };
        this.abilityCooldown = this.abilityInfo.cooldown;
    }
    
    useDash() {
        // Dash away from monster
        if (this.monster) {
            const dx = this.x - this.monster.x;
            const dy = this.y - this.monster.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Store start position for particles
            const startX = this.x;
            const startY = this.y;
            const dashDirX = dx / dist;
            const dashDirY = dy / dist;
            
            // Try to dash in opposite direction of monster
            const ts = CONFIG.TILE_SIZE;
            const dashDist = 150;
            
            // Check multiple dash distances to find a valid one
            for (let d = dashDist; d >= 50; d -= 25) {
                const newX = this.x + dashDirX * d;
                const newY = this.y + dashDirY * d;
                
                // Clamp to map bounds
                const clampedX = Math.max(ts, Math.min(newX, (this.map.width - 1) * ts));
                const clampedY = Math.max(ts, Math.min(newY, (this.map.height - 1) * ts));
                
                const tileX = Math.floor(clampedX / ts);
                const tileY = Math.floor(clampedY / ts);
                
                if (this.map.isWalkable(tileX, tileY)) {
                    this.x = clampedX;
                    this.y = clampedY;
                    
                    // Spawn dash particles along the path
                    this.spawnDashParticles(startX, startY, clampedX, clampedY, dashDirX, dashDirY);
                    this.isDashing = true;
                    setTimeout(() => { this.isDashing = false; }, 200);
                    break;
                }
            }
        }
        this.abilityCooldown = this.abilityInfo.cooldown;
    }
    
    spawnDashParticles(startX, startY, endX, endY, dirX, dirY) {
        // Spawn particles along the dash path
        const dashDist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const particleCount = Math.floor(dashDist / 15);
        
        for (let i = 0; i < particleCount; i++) {
            const t = i / particleCount;
            const px = startX + (endX - startX) * t;
            const py = startY + (endY - startY) * t;
            
            this.dustParticles.push({
                x: px + (Math.random() - 0.5) * 15,
                y: py + (Math.random() - 0.5) * 15,
                vx: -dirX * 50 + (Math.random() - 0.5) * 30,
                vy: -dirY * 50 + (Math.random() - 0.5) * 30,
                life: 0.3,
                maxLife: 0.3,
                size: 4 + Math.random() * 4,
                color: '#00bfff', // Dash color
            });
        }
    }
    
    useBarricade() {
        // Place barricades between AI and monster - 3 tiles: 1 front, 2 sides
        if (this.monster) {
            const dx = this.monster.x - this.x;
            const dy = this.monster.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const dirX = dx / dist;
            const dirY = dy / dist;
            
            // Perpendicular direction for side tiles
            const perpX = -dirY;
            const perpY = dirX;
            
            const ts = CONFIG.TILE_SIZE;
            
            // 3 positions in a line perpendicular to facing direction (2 tiles away)
            const positions = [
                { x: this.x + dirX * ts * 2, y: this.y + dirY * ts * 2 },                                   // Center
                { x: this.x + dirX * ts * 2 + perpX * ts, y: this.y + dirY * ts * 2 + perpY * ts },         // Left
                { x: this.x + dirX * ts * 2 - perpX * ts, y: this.y + dirY * ts * 2 - perpY * ts },         // Right
            ];
            
            for (const pos of positions) {
                const tileX = Math.floor(pos.x / ts);
                const tileY = Math.floor(pos.y / ts);
                
                // Add barricade if tile is walkable
                if (this.map.isWalkable(tileX, tileY)) {
                    this.barricades.push({
                        tileX,
                        tileY,
                        timer: this.abilityInfo.duration
                    });
                    
                    // Mark tile as blocked temporarily
                    this.map.setTemporaryWall(tileX, tileY, true);
                }
            }
        }
        this.abilityCooldown = this.abilityInfo.cooldown;
    }
    
    useSurge() {
        this.isSurging = true;
        this.surgeTimer = this.abilityInfo.duration;
        this.abilityCooldown = this.abilityInfo.cooldown;
    }
    
    updateSeekGenerator(deltaTime) {
        // Safety check for generators array
        if (!this.generators || this.generators.length === 0) {
            return;
        }
        
        // Check if all generators are done first
        const allActive = this.generators.every(g => g.isActive);
        if (allActive) {
            this.state = 'seek_exit';
            this.targetGenerator = null;
            return;
        }
        
        if (!this.targetGenerator || this.targetGenerator.isActive) {
            this.targetGenerator = this.findNearestInactiveGenerator();
        }
        
        if (!this.targetGenerator) {
            // No inactive generators found, go to exit
            this.state = 'seek_exit';
            return;
        }
        
        const distToGen = distance(this.x, this.y, this.targetGenerator.x, this.targetGenerator.y);
        
        if (distToGen < 40) {
            this.state = 'activating';
            this.targetGenerator.startActivation();
            return;
        }
        
        this.moveTowards(this.targetGenerator.x, this.targetGenerator.y, deltaTime);
    }
    
    updateActivating(deltaTime) {
        if (!this.targetGenerator || this.targetGenerator.isActive) {
            this.state = 'seek_generator';
            return;
        }
        
        // Use Generator's built-in activation system
        const completed = this.targetGenerator.updateActivation(deltaTime);
        
        if (completed) {
            this.state = 'seek_generator';
            this.targetGenerator = null;
        }
    }
    
    updateFlee(deltaTime) {
        if (this.panicTimer <= 0) {
            const allActive = this.generators && this.generators.length > 0 && this.generators.every(g => g.isActive);
            if (allActive) {
                this.state = 'seek_exit';
            } else {
                this.state = 'seek_generator';
            }
            return;
        }
        
        if (this.monster) {
            // Find a safe flee target - a walkable tile away from the monster
            const fleeTarget = this.findFleeTarget();
            
            if (fleeTarget) {
                // Only surge gives speed boost (1.8x), otherwise normal speed
                const speedMult = this.isSurging ? 1.8 : 1.0;
                this.moveTowards(fleeTarget.x, fleeTarget.y, deltaTime, speedMult);
            }
        }
    }
    
    findFleeTarget() {
        if (!this.monster) return null;
        
        const ts = CONFIG.TILE_SIZE;
        const myTile = this.map.worldToTile(this.x, this.y);
        const monsterTile = this.map.worldToTile(this.monster.x, this.monster.y);
        
        // Direction away from monster
        const dx = myTile.x - monsterTile.x;
        const dy = myTile.y - monsterTile.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const dirX = dx / dist;
        const dirY = dy / dist;
        
        // Try to find a walkable tile in the flee direction
        // Check multiple distances and angles
        const distances = [8, 6, 4, 3, 2];
        const angles = [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, Math.PI];
        
        for (const d of distances) {
            for (const angleOffset of angles) {
                // Rotate direction by angle offset
                const cos = Math.cos(angleOffset);
                const sin = Math.sin(angleOffset);
                const rotDirX = dirX * cos - dirY * sin;
                const rotDirY = dirX * sin + dirY * cos;
                
                const targetTileX = Math.round(myTile.x + rotDirX * d);
                const targetTileY = Math.round(myTile.y + rotDirY * d);
                
                // Check if this tile is walkable and further from monster
                if (this.map.isWalkable(targetTileX, targetTileY)) {
                    const distFromMonster = Math.sqrt(
                        Math.pow(targetTileX - monsterTile.x, 2) + 
                        Math.pow(targetTileY - monsterTile.y, 2)
                    );
                    const myDistFromMonster = Math.sqrt(
                        Math.pow(myTile.x - monsterTile.x, 2) + 
                        Math.pow(myTile.y - monsterTile.y, 2)
                    );
                    
                    // Only flee to tiles that are further from monster
                    if (distFromMonster > myDistFromMonster * 0.8) {
                        return this.map.tileToWorld(targetTileX, targetTileY);
                    }
                }
            }
        }
        
        // Fallback: find any walkable adjacent tile that's not towards the monster
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                if (ox === 0 && oy === 0) continue;
                
                const checkX = myTile.x + ox;
                const checkY = myTile.y + oy;
                
                if (this.map.isWalkable(checkX, checkY)) {
                    // Check it's not towards the monster
                    const toMonsterX = monsterTile.x - myTile.x;
                    const toMonsterY = monsterTile.y - myTile.y;
                    const dot = ox * toMonsterX + oy * toMonsterY;
                    
                    if (dot <= 0) {
                        return this.map.tileToWorld(checkX, checkY);
                    }
                }
            }
        }
        
        // Last resort: any walkable adjacent tile
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                if (ox === 0 && oy === 0) continue;
                const checkX = myTile.x + ox;
                const checkY = myTile.y + oy;
                if (this.map.isWalkable(checkX, checkY)) {
                    return this.map.tileToWorld(checkX, checkY);
                }
            }
        }
        
        return null;
    }
    
    updateSeekExit(deltaTime) {
        if (!this.exit) {
            // No exit reference yet, wait
            return;
        }
        
        if (!this.exit.isSpawned) {
            // Wait for exit to spawn
            return;
        }
        
        // Safety check for valid exit position
        if (this.exit.x === 0 && this.exit.y === 0) {
            return;
        }
        
        const distToExit = distance(this.x, this.y, this.exit.x, this.exit.y);
        
        if (distToExit < 30) {
            this.reachedExit = true;
            return;
        }
        
        this.moveTowards(this.exit.x, this.exit.y, deltaTime);
    }
    
    findNearestInactiveGenerator() {
        let nearest = null;
        let nearestDist = Infinity;
        
        for (const gen of this.generators) {
            if (!gen.isActive) {
                const dist = distance(this.x, this.y, gen.x, gen.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = gen;
                }
            }
        }
        
        return nearest;
    }
    
    moveTowards(targetX, targetY, deltaTime, speedMult = 1.0) {
        if (this.pathUpdateTimer <= 0) {
            this.pathUpdateTimer = 0.3;
            const start = this.map.worldToTile(this.x, this.y);
            const end = this.map.worldToTile(targetX, targetY);
            this.path = this.pathfinder.findPath(start.x, start.y, end.x, end.y) || [];
        }
        
        if (this.path && this.path.length > 0) {
            const nextTile = this.path[0];
            const nextPos = this.map.tileToWorld(nextTile.x, nextTile.y);
            
            const dx = nextPos.x - this.x;
            const dy = nextPos.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 5) {
                this.path.shift();
            } else {
                const moveSpeed = this.speed * speedMult * deltaTime;
                this.x += (dx / dist) * moveSpeed;
                this.y += (dy / dist) * moveSpeed;
                
                // Update facing angle
                this.facingAngle = Math.atan2(dy, dx);
                this.bobOffset = Math.sin(this.bobPhase) * 2;
            }
        }
    }
    
    // Render exactly like the normal Player
    render(ctx) {
        // Render dust particles first (behind player)
        for (const p of this.dustParticles) {
            const alpha = p.life / p.maxLife * 0.5;
            if (p.color) {
                // Colored particle (e.g., dash)
                const r = parseInt(p.color.slice(1, 3), 16);
                const g = parseInt(p.color.slice(3, 5), 16);
                const b = parseInt(p.color.slice(5, 7), 16);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else {
                ctx.fillStyle = `rgba(150, 150, 150, ${alpha})`;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
        }
        
        const x = this.x;
        const y = this.y + this.bobOffset;
        const s = this.size;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, this.y + s / 2 + 2, s / 2, s / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Body color - cyan when dashing, orange when surging
        let bodyColor = '#4ecdc4';
        let strokeColor = '#2a9d8f';
        
        if (this.isDashing) {
            // Cyan/electric blue when dashing
            bodyColor = '#00bfff';
            strokeColor = '#0088cc';
        } else if (this.isSurging) {
            // Orange/yellow glow when surging
            bodyColor = '#ffaa00';
            strokeColor = '#cc8800';
        }
        
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        
        this.roundRect(ctx, x - s / 2, y - s / 2, s, s, 8);
        ctx.fill();
        ctx.stroke();
        
        // Single Eye (same as Player)
        const eyeY = y - s * 0.1;
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, eyeY, s * 0.25, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupil
        const pupilDist = s * 0.08;
        const pupilX = x + Math.cos(this.facingAngle) * pupilDist;
        const pupilY = eyeY + Math.sin(this.facingAngle) * pupilDist;
        
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(pupilX, pupilY, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(pupilX - s * 0.04, pupilY - s * 0.04, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        
        // Direction indicator
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.facingAngle);
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(s / 2 + 8, 0);
        ctx.lineTo(s / 2 - 2, -5);
        ctx.lineTo(s / 2 - 2, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    // Render decoy effect
    renderDecoy(ctx) {
        if (!this.activeDecoy) return;
        
        const d = this.activeDecoy;
        const progress = d.timer / d.maxTimer;
        
        // Pulsing glow
        const pulseSize = 25 + Math.sin(Date.now() / 100) * 5;
        const gradient = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, pulseSize);
        gradient.addColorStop(0, `rgba(255, 150, 50, ${0.6 * progress})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${0.3 * progress})`);
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(d.x, d.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#ff9500';
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Timer ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 15, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
    }
    
    // Render barricades
    renderBarricades(ctx) {
        const ts = CONFIG.TILE_SIZE;
        
        for (const b of this.barricades) {
            const x = b.tileX * ts;
            const y = b.tileY * ts;
            
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(x, y, ts, ts);
            
            ctx.strokeStyle = '#2e7d32';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, ts, ts);
        }
    }
    
    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
