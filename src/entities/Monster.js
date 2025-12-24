import { CONFIG } from '../main.js';
import { resolveCollision, lineOfSight, distance } from '../world/Collision.js';
import { AStar } from '../world/Pathfinding.js';

export class Monster {
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
        this.state = 'patrol'; // patrol, chase, investigate, search
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
    }
    
    setGeneratorsActivated(count) {
        this.generatorsActivated = count;
        this.speed = this.baseSpeed + count * CONFIG.MONSTER_SPEED_INCREMENT;
    }
    
    onNoiseEvent(x, y) {
        const dist = distance(this.x, this.y, x, y);
        if (dist <= CONFIG.MONSTER_HEARING_RANGE) {
            this.investigatePosition = { x, y };
            this.investigateTimer = CONFIG.MONSTER_INVESTIGATION_DURATION;
            if (this.state !== 'chase') {
                this.state = 'investigate';
            }
        }
    }
    
    lureToDecoy(decoy) {
        this.decoyTarget = decoy;
        this.decoyTimer = CONFIG.DECOY_LURE_TIME;
        this.state = 'decoy';
    }
    
    update(deltaTime, player, doors, decoys) {
        // Animation
        this.pulseOffset = Math.sin(performance.now() / 500) * 2;
        this.tentaclePhase += deltaTime * 3;
        
        // Check for active decoy
        if (this.decoyTimer > 0) {
            this.decoyTimer -= deltaTime;
            if (this.decoyTimer <= 0 || !this.decoyTarget || !this.decoyTarget.active) {
                this.decoyTarget = null;
                this.state = 'patrol';
            }
        }
        
        // Get closed doors for pathfinding
        const closedDoors = doors.filter(d => d.isClosed);
        
        // Line of sight check to player
        const hasLOS = lineOfSight(this.x, this.y, player.x, player.y, this.map);
        const distToPlayer = distance(this.x, this.y, player.x, player.y);
        
        // Update eye tracking
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const eyeDist = Math.sqrt(dx * dx + dy * dy);
        this.eyeOffset.x = (dx / eyeDist) * 3 || 0;
        this.eyeOffset.y = (dy / eyeDist) * 3 || 0;
        
        // State machine
        if (this.state === 'decoy' && this.decoyTarget) {
            this.target = { x: this.decoyTarget.x, y: this.decoyTarget.y };
        } else if (hasLOS && distToPlayer <= CONFIG.MONSTER_LOS_DISTANCE) {
            // Can see player - chase!
            this.state = 'chase';
            this.lastSeenPosition = { x: player.x, y: player.y };
            this.lastSeenTimer = CONFIG.MONSTER_MEMORY_DURATION;
            
            // Predict player position
            const leadTime = CONFIG.MONSTER_LEAD_TIME;
            const predictedX = player.x + player.vx * leadTime * 60;
            const predictedY = player.y + player.vy * leadTime * 60;
            
            // Use predicted position if it's walkable
            const predictedTile = this.map.worldToTile(predictedX, predictedY);
            if (this.map.isWalkable(predictedTile.x, predictedTile.y)) {
                this.target = { x: predictedX, y: predictedY };
            } else {
                this.target = { x: player.x, y: player.y };
            }
        } else if (this.state === 'chase') {
            // Lost sight - go to last seen position
            this.lastSeenTimer -= deltaTime;
            if (this.lastSeenTimer <= 0) {
                this.state = 'search';
                this.searchTimer = CONFIG.MONSTER_SEARCH_DURATION;
                this.generateSearchPattern();
            } else {
                this.target = this.lastSeenPosition;
            }
        } else if (this.state === 'investigate') {
            this.target = this.investigatePosition;
            this.investigateTimer -= deltaTime;
            
            const distToInvestigate = distance(this.x, this.y, this.investigatePosition.x, this.investigatePosition.y);
            if (distToInvestigate < 40 || this.investigateTimer <= 0) {
                this.state = 'patrol';
                this.investigatePosition = null;
            }
        } else if (this.state === 'search') {
            this.searchTimer -= deltaTime;
            if (this.searchTimer <= 0) {
                this.state = 'patrol';
            } else {
                // Follow search pattern
                if (this.searchPattern.length > 0) {
                    this.target = this.searchPattern[this.searchIndex];
                    const distToSearch = distance(this.x, this.y, this.target.x, this.target.y);
                    if (distToSearch < 30) {
                        this.searchIndex = (this.searchIndex + 1) % this.searchPattern.length;
                    }
                }
            }
        } else {
            // Patrol - wander around
            this.state = 'patrol';
            if (!this.target || distance(this.x, this.y, this.target.x, this.target.y) < 30) {
                this.target = this.getRandomPatrolPoint();
            }
        }
        
        // Pathfinding
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
        
        // Follow path
        if (this.path.length > 1) {
            const nextTile = this.path[1];
            const nextPos = this.map.tileToWorld(nextTile.x, nextTile.y);
            
            const dx = nextPos.x - this.x;
            const dy = nextPos.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                const moveX = (dx / dist) * this.speed * deltaTime;
                const moveY = (dy / dist) * this.speed * deltaTime;
                
                const newPos = resolveCollision(this.x, this.y, moveX, moveY, this.size, this.map, closedDoors);
                this.x = newPos.x;
                this.y = newPos.y;
            } else {
                this.path.shift();
            }
        } else if (this.target) {
            // Direct movement fallback
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                const moveX = (dx / dist) * this.speed * deltaTime;
                const moveY = (dy / dist) * this.speed * deltaTime;
                
                const newPos = resolveCollision(this.x, this.y, moveX, moveY, this.size, this.map, closedDoors);
                this.x = newPos.x;
                this.y = newPos.y;
            }
        }
    }
    
    generateSearchPattern() {
        this.searchPattern = [];
        const baseX = this.lastSeenPosition ? this.lastSeenPosition.x : this.x;
        const baseY = this.lastSeenPosition ? this.lastSeenPosition.y : this.y;
        
        // Create a small search pattern around last seen position
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
        // Find a random walkable tile
        for (let attempts = 0; attempts < 50; attempts++) {
            const tx = Math.floor(Math.random() * this.map.width);
            const ty = Math.floor(Math.random() * this.map.height);
            
            if (this.map.isWalkable(tx, ty)) {
                return this.map.tileToWorld(tx, ty);
            }
        }
        return { x: this.x, y: this.y };
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
        
        // Body (blob shape)
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
}
