import { CONFIG } from '../../main.js';
import { resolveCollision, lineOfSight, distance } from '../../world/Collision.js';
import { AStar } from '../../world/Pathfinding.js';

// ============================================
// BASE MONSTER CLASS
// Shared functionality for all monster variants
// ============================================
export class BaseMonster {
    constructor(x, y, map) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.MONSTER_SIZE;
        this.baseSpeed = CONFIG.MONSTER_BASE_SPEED;
        this.speed = this.baseSpeed;
        
        this.map = map;
        this.pathfinder = new AStar(map);
        this.path = [];
        this.pathUpdateTimer = 0;
        
        // AI State
        this.state = 'patrol'; // patrol, chase, investigate, search, decoy
        this.target = null;
        this.lastSeenPosition = null;
        this.lastSeenTimer = 0;
        this.searchTimer = 0;
        this.searchPattern = [];
        this.searchIndex = 0;
        
        // Investigation (noise events)
        this.investigatePosition = null;
        this.investigateTimer = 0;
        
        // Decoy lure
        this.decoyTarget = null;
        this.decoyTimer = 0;
        
        // Animation
        this.pulseOffset = 0;
        this.eyeOffset = { x: 0, y: 0 };
        this.tentaclePhase = 0;
        
        // Tension ramp
        this.generatorsActivated = 0;
        
        // Monster variant info (override in subclasses)
        this.name = 'Monster';
        this.description = 'A mysterious creature';
    }
    
    // ============================================
    // CORE METHODS (shared by all monsters)
    // ============================================
    
    setGeneratorsActivated(count) {
        this.generatorsActivated = count;
        this.updateSpeedForGenerators(count);
    }
    
    // Override in subclasses for custom speed scaling
    updateSpeedForGenerators(count) {
        this.speed = this.baseSpeed + count * CONFIG.MONSTER_SPEED_INCREMENT;
    }
    
    onNoiseEvent(x, y) {
        const dist = distance(this.x, this.y, x, y);
        if (dist <= this.getHearingRange()) {
            this.handleNoiseEvent(x, y, dist);
        }
    }
    
    // Override in subclasses for custom noise handling
    getHearingRange() {
        return CONFIG.MONSTER_HEARING_RANGE;
    }
    
    handleNoiseEvent(x, y, dist) {
        this.investigatePosition = { x, y };
        this.investigateTimer = CONFIG.MONSTER_INVESTIGATION_DURATION;
        if (this.state !== 'chase') {
            this.state = 'investigate';
        }
    }
    
    lureToDecoy(decoy) {
        this.decoyTarget = decoy;
        this.decoyTimer = CONFIG.DECOY_LURE_TIME;
        this.state = 'decoy';
    }
    
    // ============================================
    // UPDATE LOOP
    // ============================================
    
    update(deltaTime, player, doors, decoys) {
        // Animation
        this.updateAnimation(deltaTime);
        
        // Check for nearby decoys and get lured
        this.checkForDecoys(decoys);
        
        // Check for active decoy
        this.updateDecoyState(deltaTime);
        
        // Get closed doors for pathfinding
        const closedDoors = doors.filter(d => d.isClosed);
        
        // Line of sight check to player - hidden players cannot be seen
        const hasLOS = !player.isHiding && lineOfSight(this.x, this.y, player.x, player.y, this.map);
        const distToPlayer = distance(this.x, this.y, player.x, player.y);
        
        // If player just hid while we were chasing, lose track of them
        if (player.isHiding && this.state === 'chase') {
            this.state = 'search';
            this.searchTimer = CONFIG.MONSTER_SEARCH_DURATION;
            this.generateSearchPattern();
            this.lastSeenPosition = null;
            this.lastSeenTimer = 0;
        }
        
        // Update eye tracking (don't track hidden players)
        this.updateEyeTracking(player);
        
        // Pre-update hook for subclasses
        this.preUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer);
        
        // State machine
        this.updateStateMachine(deltaTime, player, hasLOS, distToPlayer);
        
        // Post-update hook for subclasses
        this.postUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer);
        
        // Pathfinding and movement
        this.updatePathfinding(deltaTime, closedDoors);
        this.updateMovement(deltaTime, closedDoors);
    }
    
    updateAnimation(deltaTime) {
        this.pulseOffset = Math.sin(performance.now() / 500) * 2;
        this.tentaclePhase += deltaTime * 3;
    }
    
    updateDecoyState(deltaTime) {
        if (this.decoyTimer > 0) {
            this.decoyTimer -= deltaTime;
            if (this.decoyTimer <= 0 || !this.decoyTarget || !this.decoyTarget.active) {
                this.decoyTarget = null;
                this.state = 'patrol';
            }
        }
    }
    
    checkForDecoys(decoys) {
        // Already lured to a decoy
        if (this.state === 'decoy' && this.decoyTarget && this.decoyTarget.active) {
            return;
        }
        
        // Check for nearby active decoys
        for (const decoy of decoys) {
            if (!decoy.active) continue;
            
            const dist = distance(this.x, this.y, decoy.x, decoy.y);
            if (dist <= CONFIG.MONSTER_HEARING_RANGE) {
                this.lureToDecoy(decoy);
                return;
            }
        }
    }
    
    updateEyeTracking(player) {
        // Don't track hidden players - look forward instead
        if (player.isHiding) {
            // Slowly return eye to center
            this.eyeOffset.x *= 0.9;
            this.eyeOffset.y *= 0.9;
            return;
        }
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const eyeDist = Math.sqrt(dx * dx + dy * dy);
        this.eyeOffset.x = (dx / eyeDist) * 3 || 0;
        this.eyeOffset.y = (dy / eyeDist) * 3 || 0;
    }
    
    // Override in subclasses for custom behaviour
    preUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer) {}
    postUpdateBehaviour(deltaTime, player, hasLOS, distToPlayer) {}
    
    updateStateMachine(deltaTime, player, hasLOS, distToPlayer) {
        if (this.state === 'decoy' && this.decoyTarget) {
            this.target = { x: this.decoyTarget.x, y: this.decoyTarget.y };
        } else if (this.shouldChasePlayer(hasLOS, distToPlayer)) {
            this.enterChaseState(player);
        } else if (this.state === 'chase') {
            this.updateChaseState(deltaTime);
        } else if (this.state === 'investigate') {
            this.updateInvestigateState(deltaTime);
        } else if (this.state === 'search') {
            this.updateSearchState(deltaTime);
        } else {
            this.updatePatrolState();
        }
    }
    
    // Override in subclasses for custom chase conditions
    // Note: hasLOS is already false if player is hiding (checked in update)
    shouldChasePlayer(hasLOS, distToPlayer) {
        return hasLOS && distToPlayer <= CONFIG.MONSTER_LOS_DISTANCE;
    }
    
    enterChaseState(player) {
        this.state = 'chase';
        this.lastSeenPosition = { x: player.x, y: player.y };
        this.lastSeenTimer = CONFIG.MONSTER_MEMORY_DURATION;
        
        // Predict player position
        this.target = this.getPredictedTarget(player);
    }
    
    // Override in subclasses for custom prediction
    getPredictedTarget(player) {
        // Don't predict hidden player positions
        if (player.isHiding) {
            return this.getRandomPatrolPoint();
        }
        
        const leadTime = CONFIG.MONSTER_LEAD_TIME;
        const predictedX = player.x + player.vx * leadTime * 60;
        const predictedY = player.y + player.vy * leadTime * 60;
        
        const predictedTile = this.map.worldToTile(predictedX, predictedY);
        if (this.map.isWalkable(predictedTile.x, predictedTile.y)) {
            return { x: predictedX, y: predictedY };
        }
        return { x: player.x, y: player.y };
    }
    
    updateChaseState(deltaTime) {
        this.lastSeenTimer -= deltaTime;
        if (this.lastSeenTimer <= 0) {
            this.state = 'search';
            this.searchTimer = CONFIG.MONSTER_SEARCH_DURATION;
            this.generateSearchPattern();
        } else {
            this.target = this.lastSeenPosition;
        }
    }
    
    updateInvestigateState(deltaTime) {
        this.target = this.investigatePosition;
        this.investigateTimer -= deltaTime;
        
        const distToInvestigate = distance(this.x, this.y, this.investigatePosition.x, this.investigatePosition.y);
        if (distToInvestigate < 40 || this.investigateTimer <= 0) {
            this.state = 'patrol';
            this.investigatePosition = null;
        }
    }
    
    updateSearchState(deltaTime) {
        this.searchTimer -= deltaTime;
        if (this.searchTimer <= 0) {
            this.state = 'patrol';
        } else if (this.searchPattern.length > 0) {
            this.target = this.searchPattern[this.searchIndex];
            const distToSearch = distance(this.x, this.y, this.target.x, this.target.y);
            if (distToSearch < 30) {
                this.searchIndex = (this.searchIndex + 1) % this.searchPattern.length;
            }
        }
    }
    
    updatePatrolState() {
        this.state = 'patrol';
        if (!this.target || distance(this.x, this.y, this.target.x, this.target.y) < 30) {
            this.target = this.getRandomPatrolPoint();
        }
    }
    
    generateSearchPattern() {
        this.searchPattern = [];
        const baseX = this.lastSeenPosition ? this.lastSeenPosition.x : this.x;
        const baseY = this.lastSeenPosition ? this.lastSeenPosition.y : this.y;
        
        const offsets = [
            { x: 60, y: 0 },
            { x: 0, y: 60 },
            { x: -60, y: 0 },
            { x: 0, y: -60 },
        ];
        
        for (const offset of offsets) {
            const px = baseX + offset.x;
            const py = baseY + offset.y;
            const tile = this.map.worldToTile(px, py);
            if (this.map.isWalkable(tile.x, tile.y)) {
                this.searchPattern.push({ x: px, y: py });
            }
        }
        
        this.searchIndex = 0;
    }
    
    getRandomPatrolPoint() {
        for (let attempts = 0; attempts < 50; attempts++) {
            const tx = Math.floor(Math.random() * this.map.width);
            const ty = Math.floor(Math.random() * this.map.height);
            
            if (this.map.isWalkable(tx, ty)) {
                return this.map.tileToWorld(tx, ty);
            }
        }
        return { x: this.x, y: this.y };
    }
    
    updatePathfinding(deltaTime, closedDoors) {
        this.pathUpdateTimer -= deltaTime;
        if (this.pathUpdateTimer <= 0 && this.target) {
            this.pathUpdateTimer = CONFIG.MONSTER_PATH_UPDATE_INTERVAL;
            
            const startTile = this.map.worldToTile(this.x, this.y);
            const endTile = this.map.worldToTile(this.target.x, this.target.y);
            
            this.path = this.pathfinder.findPath(
                startTile.x, startTile.y,
                endTile.x, endTile.y,
                closedDoors
            );
        }
    }
    
    updateMovement(deltaTime, closedDoors) {
        const currentSpeed = this.getCurrentSpeed();
        
        if (this.path.length > 1) {
            const nextTile = this.path[1];
            const nextPos = this.map.tileToWorld(nextTile.x, nextTile.y);
            
            const dx = nextPos.x - this.x;
            const dy = nextPos.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                const moveX = (dx / dist) * currentSpeed * deltaTime;
                const moveY = (dy / dist) * currentSpeed * deltaTime;
                
                const newPos = resolveCollision(this.x, this.y, moveX, moveY, this.size, this.map, closedDoors, true);
                this.x = newPos.x;
                this.y = newPos.y;
            } else {
                this.path.shift();
            }
        } else if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                const moveX = (dx / dist) * currentSpeed * deltaTime;
                const moveY = (dy / dist) * currentSpeed * deltaTime;
                
                const newPos = resolveCollision(this.x, this.y, moveX, moveY, this.size, this.map, closedDoors, true);
                this.x = newPos.x;
                this.y = newPos.y;
            }
        }
    }
    
    // Override in subclasses for dynamic speed changes
    getCurrentSpeed() {
        return this.speed;
    }
    
    // ============================================
    // RENDERING
    // ============================================
    
    render(ctx) {
        const x = this.x;
        const y = this.y + this.pulseOffset;
        const s = this.size;
        
        // Shadow
        this.renderShadow(ctx, x, y, s);
        
        // Legs/Tentacles
        this.renderLegs(ctx, x, y, s);
        
        // Body
        this.renderBody(ctx, x, y, s);
        
        // Eye(s)
        this.renderEyes(ctx, x, y, s);
    }
    
    renderShadow(ctx, x, y, s) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, this.y + s / 2 + 3, s / 2 + 2, s / 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderLegs(ctx, x, y, s) {
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
    }
    
    renderBody(ctx, x, y, s) {
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
    }
    
    renderEyes(ctx, x, y, s) {
        // Eye white
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
    
    renderDebug(ctx, player) {
        // Draw path
        if (this.path.length > 0) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            
            for (const tile of this.path) {
                const pos = this.map.tileToWorld(tile.x, tile.y);
                ctx.lineTo(pos.x, pos.y);
            }
            ctx.stroke();
        }
        
        // Draw LOS line
        const hasLOS = lineOfSight(this.x, this.y, player.x, player.y, this.map);
        ctx.strokeStyle = hasLOS ? 'rgba(255, 255, 0, 0.5)' : 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(player.x, player.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw target
        if (this.target) {
            ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(this.target.x, this.target.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // State text
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`State: ${this.state}`, this.x - 30, this.y - 40);
    }
    
    // ============================================
    // COLLISION CHECK (for player death)
    // ============================================
    
    canKillPlayer() {
        return true; // Override in subclasses if needed
    }
}
