import { CONFIG } from '../main.js';
import { resolveCollision } from '../world/Collision.js';
import { getAbilityInfo } from './AbilityFactory.js';
import { Decoy } from './Decoy.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.size = CONFIG.PLAYER_SIZE;
        this.speed = CONFIG.PLAYER_SPEED;
        
        // Animation
        this.bobOffset = 0;
        this.bobSpeed = 10;
        this.isMoving = false;
        this.facingAngle = 0;
        
        // Footstep
        this.footstepTimer = 0;
        this.footstepInterval = 0.25;
        
        // Dust particles
        this.dustParticles = [];
        
        // Ability system (replaces decoy)
        this.abilityType = null;
        this.abilityInfo = null;
        this.abilityAvailable = true;
        this.abilityCooldown = 0;
        this.abilityActive = false;
        this.abilityDuration = 0;
        
        // Ability-specific state
        this.isDashing = false;
        this.dashDirection = { x: 0, y: 0 };
        this.dashTimer = 0;
        
        this.isSurging = false;
        this.surgeTimer = 0;
        
        this.isPulsing = false;
        this.pulseTimer = 0;
        this.pulseFlashAlpha = 0;
        
        // Barricade tiles placed by player
        this.barricades = []; // { tileX, tileY, timer }
        
        // Hiding state (for cabinets)
        this.isHiding = false;
        this.hiddenInCabinet = null;
        this.preHideX = 0;
        this.preHideY = 0;
    }
    
    setAbility(abilityType) {
        this.abilityType = abilityType;
        this.abilityInfo = getAbilityInfo(abilityType);
        this.abilityAvailable = true;
        this.abilityCooldown = 0;
        this.abilityActive = false;
    }
    
    update(deltaTime, keys, map, doors, game) {
        // Update barricades
        this.updateBarricades(deltaTime, map);
        
        // Update ability state
        this.updateAbilityState(deltaTime);
        
        // Don't allow movement while hiding
        if (this.isHiding) {
            this.vx = 0;
            this.vy = 0;
            this.isMoving = false;
            return;
        }
        
        // Handle dash movement separately
        if (this.isDashing) {
            this.updateDash(deltaTime, map);
            return;
        }
        
        // Input
        let dx = 0;
        let dy = 0;
        
        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
        
        // Mirror mode: reverse all controls
        if (this.mirrorControls) {
            dx = -dx;
            dy = -dy;
        }
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }
        
        // Check for puddle slowdown
        let speedMultiplier = 1.0;
        if (map.isInPuddle(this.x, this.y)) {
            speedMultiplier = 0.6; // 40% slowdown in puddles
        }
        
        // Apply surge speed boost
        if (this.isSurging) {
            speedMultiplier *= this.abilityInfo.speedMultiplier;
        }
        
        this.vx = dx * this.speed * speedMultiplier * deltaTime;
        this.vy = dy * this.speed * speedMultiplier * deltaTime;
        
        // Apply map zone effects (e.g. conveyor belts)
        if (map.mapConfig.zones) {
            const worldX = this.x;
            const worldY = this.y;
            const ts = CONFIG.TILE_SIZE;
            
            for (const zone of map.mapConfig.zones) {
                const zx = zone.x * ts;
                const zy = zone.y * ts;
                const zw = zone.width * ts;
                const zh = zone.height * ts;
                
                if (worldX >= zx && worldX <= zx + zw && worldY >= zy && worldY <= zy + zh) {
                    if (zone.type === 'conveyor_right') {
                        this.vx += 100 * deltaTime;
                    } else if (zone.type === 'conveyor_left') {
                        this.vx -= 100 * deltaTime;
                    }
                }
            }
        }
        
        this.isMoving = dx !== 0 || dy !== 0;
        
        if (this.isMoving) {
            this.facingAngle = Math.atan2(dy, dx);
        }
        
        // Apply movement with collision (check barricades too)
        const newPos = resolveCollision(this.x, this.y, this.vx, this.vy, this.size, map, doors);
        this.x = newPos.x;
        this.y = newPos.y;
        
        // Animation
        if (this.isMoving) {
            this.bobOffset = Math.sin(performance.now() / 1000 * this.bobSpeed) * 2;
            
            // Footsteps (faster when surging)
            const footstepMult = this.isSurging ? 0.5 : 1.0;
            this.footstepTimer += deltaTime;
            if (this.footstepTimer >= this.footstepInterval * footstepMult) {
                this.footstepTimer = 0;
                game.audioManager.playFootstep();
                
                // Spawn dust (more when surging)
                const dustCount = this.isSurging ? 2 : 1;
                for (let i = 0; i < dustCount; i++) {
                    this.dustParticles.push({
                        x: this.x + (Math.random() - 0.5) * 10,
                        y: this.y + this.size / 2,
                        vx: (Math.random() - 0.5) * 20,
                        vy: -Math.random() * 15,
                        life: 0.4,
                        maxLife: 0.4,
                        size: 3 + Math.random() * 3,
                    });
                }
            }
        } else {
            this.bobOffset *= 0.9;
        }
        
        // Update dust particles
        this.dustParticles = this.dustParticles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += 30 * deltaTime; // gravity
            p.life -= deltaTime;
            return p.life > 0;
        });
        
        // Ability cooldown
        if (!this.abilityAvailable) {
            this.abilityCooldown -= deltaTime;
            if (this.abilityCooldown <= 0) {
                this.abilityAvailable = true;
            }
        }
    }
    
    updateAbilityState(deltaTime) {
        // Update pulse flash
        if (this.isPulsing) {
            this.pulseTimer -= deltaTime;
            // Flash effect - bright at start, fades
            this.pulseFlashAlpha = Math.max(0, this.pulseTimer / this.abilityInfo.duration);
            if (this.pulseTimer <= 0) {
                this.isPulsing = false;
                this.pulseFlashAlpha = 0;
            }
        }
        
        // Update surge
        if (this.isSurging) {
            this.surgeTimer -= deltaTime;
            if (this.surgeTimer <= 0) {
                this.isSurging = false;
            }
        }
    }
    
    updateDash(deltaTime, map) {
        this.dashTimer -= deltaTime;
        
        if (this.dashTimer <= 0) {
            this.isDashing = false;
            // Ensure we end up in a valid position
            const tile = map.worldToTile(this.x, this.y);
            if (map.isWall(tile.x, tile.y)) {
                // Find nearest valid tile
                const dirs = [
                    { x: 1, y: 0 }, { x: -1, y: 0 },
                    { x: 0, y: 1 }, { x: 0, y: -1 },
                    { x: 1, y: 1 }, { x: -1, y: -1 },
                    { x: 1, y: -1 }, { x: -1, y: 1 }
                ];
                for (const dir of dirs) {
                    const checkX = tile.x + dir.x;
                    const checkY = tile.y + dir.y;
                    if (!map.isWall(checkX, checkY)) {
                        const pos = map.tileToWorld(checkX, checkY);
                        this.x = pos.x;
                        this.y = pos.y;
                        break;
                    }
                }
            }
            return;
        }
        
        // Move in dash direction, ignoring walls but not map boundaries
        // Apply Sine ease-out smoothing (starts fast, slows down gently)
        const progress = this.dashTimer / this.abilityInfo.duration; // 1.0 to 0.0
        const speedMultiplier = Math.sin(progress * Math.PI / 2);
        
        const dashSpeed = this.abilityInfo.dashSpeed * speedMultiplier;
        
        const newX = this.x + this.dashDirection.x * dashSpeed * deltaTime;
        const newY = this.y + this.dashDirection.y * dashSpeed * deltaTime;
        
        // Clamp to map boundaries
        const ts = CONFIG.TILE_SIZE;
        const minX = ts * 1.5;
        const maxX = (map.width - 1.5) * ts;
        const minY = ts * 1.5;
        const maxY = (map.height - 1.5) * ts;
        
        this.x = Math.max(minX, Math.min(maxX, newX));
        this.y = Math.max(minY, Math.min(maxY, newY));
        
        // Spawn dash particles
        this.dustParticles.push({
            x: this.x + (Math.random() - 0.5) * 15,
            y: this.y + (Math.random() - 0.5) * 15,
            vx: -this.dashDirection.x * 50 + (Math.random() - 0.5) * 30,
            vy: -this.dashDirection.y * 50 + (Math.random() - 0.5) * 30,
            life: 0.3,
            maxLife: 0.3,
            size: 4 + Math.random() * 4,
            color: this.abilityInfo.color,
        });
    }
    
    updateBarricades(deltaTime, map) {
        this.barricades = this.barricades.filter(b => {
            b.timer -= deltaTime;
            if (b.timer <= 0) {
                // Remove barricade from map
                if (map.data[b.tileY] && map.data[b.tileY][b.tileX] === 99) {
                    map.data[b.tileY][b.tileX] = 0; // Restore to floor
                    
                    // Spawn particles
                    const worldX = map.tileToWorld(b.tileX, b.tileY).x;
                    const worldY = map.tileToWorld(b.tileX, b.tileY).y;
                    
                    for (let i = 0; i < 10; i++) {
                        this.dustParticles.push({
                            x: worldX + (Math.random() - 0.5) * CONFIG.TILE_SIZE,
                            y: worldY + (Math.random() - 0.5) * CONFIG.TILE_SIZE,
                            vx: (Math.random() - 0.5) * 50,
                            vy: (Math.random() - 0.5) * 50,
                            life: 0.5,
                            maxLife: 0.5,
                            size: 3 + Math.random() * 3,
                            color: '#4caf50' // Green debris
                        });
                    }
                }
                return false;
            }
            return true;
        });
    }
    
    useAbility(map, game) {
        if (!this.abilityAvailable || !this.abilityInfo) return false;
        
        this.abilityAvailable = false;
        this.abilityCooldown = this.abilityInfo.cooldown;
        
        switch (this.abilityType) {
            case 'DASH':
                this.activateDash();
                break;
            case 'SURGE':
                this.activateSurge();
                break;
            case 'PULSE':
                this.activatePulse();
                break;
            case 'BARRICADE':
                this.activateBarricade(map);
                break;
            case 'DECOY':
                this.activateDecoy(game);
                break;
        }
        
        return true;
    }
    
    activateDash() {
        this.isDashing = true;
        this.dashTimer = this.abilityInfo.duration;
        this.dashDirection = {
            x: Math.cos(this.facingAngle),
            y: Math.sin(this.facingAngle)
        };
    }
    
    activateSurge() {
        this.isSurging = true;
        this.surgeTimer = this.abilityInfo.duration;
    }
    
    activatePulse() {
        this.isPulsing = true;
        this.pulseTimer = this.abilityInfo.duration;
        this.pulseFlashAlpha = 1.0;
    }
    
    activateBarricade(map) {
        const ts = CONFIG.TILE_SIZE;
        const dirX = Math.cos(this.facingAngle);
        const dirY = Math.sin(this.facingAngle);
        
        // Perpendicular direction for side tiles
        const perpX = -dirY;
        const perpY = dirX;
        
        // Place 3 wall tiles in a line perpendicular to facing direction
        const positions = [
            { x: this.x + dirX * ts * 2, y: this.y + dirY * ts * 2 },                                   // Center (2 tiles away)
            { x: this.x + dirX * ts * 2 + perpX * ts, y: this.y + dirY * ts * 2 + perpY * ts },         // Left side
            { x: this.x + dirX * ts * 2 - perpX * ts, y: this.y + dirY * ts * 2 - perpY * ts },         // Right side
        ];
        
        for (const pos of positions) {
            const tile = map.worldToTile(pos.x, pos.y);
            
            // Only place on floor tiles, not walls or boundaries
            if (tile.x > 0 && tile.x < map.width - 1 &&
                tile.y > 0 && tile.y < map.height - 1 &&
                !map.isWall(tile.x, tile.y)) {
                
                // Mark as temporary wall (99 = barricade)
                map.data[tile.y][tile.x] = 99;
                
                this.barricades.push({
                    tileX: tile.x,
                    tileY: tile.y,
                    timer: this.abilityInfo.duration
                });
            }
        }
    }
    
    activateDecoy(game) {
        // Spawn decoy at player's current position
        const decoy = new Decoy(this.x, this.y);
        game.currentState.decoys.push(decoy);
    }
    
    // Get footstep loudness multiplier (for Echo monster)
    getFootstepLoudness() {
        if (this.isSurging && this.abilityInfo) {
            return this.abilityInfo.footstepMultiplier;
        }
        return 1.0;
    }
    
    render(ctx) {
        // Don't render player when hiding
        if (this.isHiding) return;
        
        // Dust particles
        for (const p of this.dustParticles) {
            const alpha = p.life / p.maxLife * 0.5;
            if (p.color) {
                // Colored particle (e.g., dash) - convert hex to rgba
                const hex = p.color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else {
                ctx.fillStyle = `rgba(150, 140, 130, ${alpha})`;
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
        
        // Body (rounded square) - color changes during abilities
        let bodyColor = '#4ecdc4';
        let strokeColor = '#2a9d8f';
        
        if (this.isDashing) {
            // Cyan/electric blue when dashing
            bodyColor = '#00bfff';
            strokeColor = '#0088cc';
        } else if (this.isSurging) {
            // Red/orange when surging
            bodyColor = '#ff6b6b';
            strokeColor = '#cc4444';
        }
        
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        
        this.roundRect(ctx, x - s / 2, y - s / 2, s, s, 8);
        ctx.fill();
        ctx.stroke();
        
        // Glow effect during abilities
        if (this.isDashing || this.isSurging) {
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 100) * 0.2;
            ctx.strokeStyle = this.isDashing ? '#00bfff' : '#ff6b6b';
            ctx.lineWidth = 6;
            this.roundRect(ctx, x - s / 2 - 2, y - s / 2 - 2, s + 4, s + 4, 10);
            ctx.stroke();
            ctx.restore();
        }
        
        // Single Eye (Monster style but smaller)
        const eyeY = y - s * 0.1;
        
        // Sclera
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, eyeY, s * 0.25, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupil (looking in facing direction)
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
        
        // Direction indicator (small triangle)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.facingAngle);
        ctx.fillStyle = '#2a9d8f';
        ctx.beginPath();
        ctx.moveTo(s / 2 + 8, 0);       // Slightly longer tip
        ctx.lineTo(s / 2 - 2, -5);      // Slightly wider base
        ctx.lineTo(s / 2 - 2, 5);       // Slightly wider base
        ctx.closePath();
        ctx.fill();
        ctx.restore();
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
