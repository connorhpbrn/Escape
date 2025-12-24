import { CONFIG } from '../main.js';

export class Cabinet {
    constructor(x, y) {
        this.tileX = x;
        this.tileY = y;
        this.x = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.y = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.size = CONFIG.TILE_SIZE;
        this.interactRadius = CONFIG.TILE_SIZE * 1.2;
        
        // Hiding state
        this.isOccupied = false;
        this.hiddenPlayer = null;
        
        // Timed hiding (same as door close duration)
        this.hideTimer = 0;
        this.hideDuration = CONFIG.DOOR_CLOSE_DURATION;
        
        // Cooldown (same as door cooldown)
        this.cooldownTimer = 0;
        this.cooldownDuration = CONFIG.DOOR_COOLDOWN;
    }
    
    update(deltaTime) {
        // Hide timer - force player out when expired
        if (this.isOccupied && this.hideTimer > 0) {
            this.hideTimer -= deltaTime;
            if (this.hideTimer <= 0) {
                // Force release player
                if (this.hiddenPlayer) {
                    this.forceRelease();
                }
            }
        }
        
        // Cooldown timer
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
        }
    }
    
    isPlayerInRange(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.interactRadius;
    }
    
    canHide(player) {
        return !this.isOccupied && this.cooldownTimer <= 0 && this.isPlayerInRange(player);
    }
    
    hidePlayer(player) {
        if (this.canHide(player)) {
            this.isOccupied = true;
            this.hiddenPlayer = player;
            this.hideTimer = this.hideDuration;
            // Store player's original position
            player.hiddenInCabinet = this;
            player.isHiding = true;
            player.preHideX = player.x;
            player.preHideY = player.y;
            // Move player to cabinet position
            player.x = this.x;
            player.y = this.y;
            return true;
        }
        return false;
    }
    
    forceRelease() {
        if (this.hiddenPlayer) {
            this.hiddenPlayer.hiddenInCabinet = null;
            this.hiddenPlayer.isHiding = false;
            this.hiddenPlayer = null;
        }
        this.isOccupied = false;
        this.cooldownTimer = this.cooldownDuration;
    }
    
    releasePlayer(player) {
        if (this.isOccupied && this.hiddenPlayer === player) {
            this.isOccupied = false;
            this.hiddenPlayer = null;
            player.hiddenInCabinet = null;
            player.isHiding = false;
            this.cooldownTimer = this.cooldownDuration;
            return true;
        }
        return false;
    }
    
    render(ctx) {
        const x = this.x;
        const y = this.y;
        const s = this.size;
        
        // Cabinet body
        ctx.fillStyle = this.isOccupied ? '#5a4a3a' : '#6b5b4b';
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 2;
        
        // Main body
        ctx.fillRect(x - s/2 + 2, y - s/2 + 2, s - 4, s - 4);
        ctx.strokeRect(x - s/2 + 2, y - s/2 + 2, s - 4, s - 4);
        
        // Door lines (vertical split)
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - s/2 + 4);
        ctx.lineTo(x, y + s/2 - 4);
        ctx.stroke();
        
        // Door handles - squares
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(x - 6, y - 2, 4, 4);
        ctx.fillRect(x + 2, y - 2, 4, 4);
        
        // Top edge highlight
        ctx.fillStyle = '#7b6b5b';
        ctx.fillRect(x - s/2 + 2, y - s/2 + 2, s - 4, 3);
        
        // Indicator when occupied
        if (this.isOccupied) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fillRect(x - s/2 + 2, y - s/2 + 2, s - 4, s - 4);
            
            // Hide timer ring (yellow, like door close timer)
            if (this.hideTimer > 0) {
                const hideProgress = this.hideTimer / this.hideDuration;
                ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + hideProgress * Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Cooldown indicator ring (red, like door cooldown)
        if (this.cooldownTimer > 0 && !this.isOccupied) {
            const cooldownProgress = this.cooldownTimer / this.cooldownDuration;
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2);
            ctx.stroke();
        }
    }
}
