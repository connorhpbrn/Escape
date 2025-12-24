import { CONFIG } from '../main.js';

export class Door {
    constructor(x, y, orientation) {
        this.tileX = x;
        this.tileY = y;
        this.orientation = orientation; // 'horizontal' or 'vertical'
        
        // Door spans 2 tiles - center between them
        if (orientation === 'horizontal') {
            this.x = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE; // Center of 2 horizontal tiles
            this.y = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            this.blockedTiles = [
                { x: x, y: y },
                { x: x + 1, y: y }
            ];
        } else {
            this.x = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            this.y = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE; // Center of 2 vertical tiles
            this.blockedTiles = [
                { x: x, y: y },
                { x: x, y: y + 1 }
            ];
        }
        
        this.isClosed = false;
        this.closeTimer = 0;
        this.cooldownTimer = 0;
        this.interactRadius = CONFIG.DOOR_INTERACT_RADIUS + 20; // Larger interact radius for 2-tile door
        
        this.animationProgress = 0; // 0 = open, 1 = closed
        
        // Destroyed state (for Sentinel smashing)
        this.isDestroyed = false;
    }
    
    update(deltaTime) {
        // Don't update if destroyed
        if (this.isDestroyed) return;
        // Close timer
        if (this.isClosed) {
            this.closeTimer -= deltaTime;
            if (this.closeTimer <= 0) {
                this.isClosed = false;
                this.cooldownTimer = CONFIG.DOOR_COOLDOWN;
            }
        }
        
        // Cooldown timer
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
        }
        
        // Animation
        const targetProgress = this.isClosed ? 1 : 0;
        this.animationProgress += (targetProgress - this.animationProgress) * deltaTime * 10;
    }
    
    close() {
        if (!this.isClosed && this.cooldownTimer <= 0) {
            this.isClosed = true;
            this.closeTimer = CONFIG.DOOR_CLOSE_DURATION;
            return true;
        }
        return false;
    }
    
    canClose() {
        return !this.isClosed && this.cooldownTimer <= 0 && !this.isDestroyed;
    }
    
    // Destroy the door permanently (Sentinel smash)
    destroy() {
        this.isDestroyed = true;
        this.isClosed = false;
        this.animationProgress = 0;
    }
    
    blocksPosition(tileX, tileY) {
        if (!this.isClosed || this.isDestroyed) return false;
        // Check if position matches any of the blocked tiles
        for (const tile of this.blockedTiles) {
            if (tileX === tile.x && tileY === tile.y) {
                return true;
            }
        }
        return false;
    }
    
    isPlayerInRange(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.interactRadius;
    }
    
    render(ctx) {
        // Don't render if destroyed
        if (this.isDestroyed) return;
        
        const ts = CONFIG.TILE_SIZE;
        const x = this.x;
        const y = this.y;
        
        // Door spans 2 tiles
        const doorLength = ts * 2;
        
        // Door frame
        ctx.fillStyle = '#4a4a5e';
        if (this.orientation === 'vertical') {
            ctx.fillRect(x - 6, y - ts, 12, doorLength);
        } else {
            ctx.fillRect(x - ts, y - 6, doorLength, 12);
        }
        
        // Door panel (animated)
        if (this.orientation === 'vertical') {
            const doorHeight = doorLength * this.animationProgress;
            // Always Blue
            ctx.fillStyle = '#0984e3';
            ctx.fillRect(x - 8, y - doorHeight / 2, 16, doorHeight);
            
            // Door edge highlight
            ctx.strokeStyle = '#74b9ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 8, y - doorHeight / 2, 16, doorHeight);
        } else {
            const doorWidth = doorLength * this.animationProgress;
            ctx.fillStyle = '#0984e3';
            ctx.fillRect(x - doorWidth / 2, y - 8, doorWidth, 16);
            
            ctx.strokeStyle = '#74b9ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - doorWidth / 2, y - 8, doorWidth, 16);
        }
        
        // Cooldown indicator
        if (this.cooldownTimer > 0 && !this.isClosed) {
            const cooldownProgress = this.cooldownTimer / CONFIG.DOOR_COOLDOWN;
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2);
            ctx.stroke();
        }
        
        // Close timer indicator
        if (this.isClosed) {
            const closeProgress = this.closeTimer / CONFIG.DOOR_CLOSE_DURATION;
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + closeProgress * Math.PI * 2);
            ctx.stroke();
        }
    }
}
