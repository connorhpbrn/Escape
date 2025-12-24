import { CONFIG, SETTINGS } from '../main.js';

export class HUD {
    constructor() {
        this.minimapPings = [];
        this.interactionPrompt = null;
    }
    
    addMinimapPing(x, y) {
        if (SETTINGS.showMinimapPing) {
            this.minimapPings.push({
                x,
                y,
                life: 1.5,
                maxLife: 1.5,
            });
        }
    }
    
    setInteractionPrompt(text) {
        this.interactionPrompt = text;
    }
    
    clearInteractionPrompt() {
        this.interactionPrompt = null;
    }
    
    update(deltaTime) {
        // Update minimap pings
        this.minimapPings = this.minimapPings.filter(p => {
            p.life -= deltaTime;
            return p.life > 0;
        });
    }
    
    render(ctx, gameState) {
        const { generators, player, monster, exit, requiredGenerators } = gameState;
        
        // Generator count - use dynamic requiredGenerators from gameState
        const activeCount = generators.filter(g => g.isActive).length;
        const totalGenerators = requiredGenerators || generators.length;
        this.renderGeneratorCounter(ctx, activeCount, totalGenerators);
        
        // Ability UI
        this.renderAbilityUI(ctx, player);
        
        // Minimap
        if (SETTINGS.showMinimapPing) {
            this.renderMinimap(ctx, gameState);
        }
        
        // Interaction prompt
        if (this.interactionPrompt) {
            this.renderInteractionPrompt(ctx, player);
        }
        
        // Panic UI (when monster is close)
        const distToMonster = Math.sqrt(
            Math.pow(player.x - monster.x, 2) + 
            Math.pow(player.y - monster.y, 2)
        );
        
        if (distToMonster < CONFIG.PANIC_DISTANCE) {
            this.renderPanicUI(ctx, distToMonster);
        }
    }
    
    renderGeneratorCounter(ctx, active, total) {
        const x = 20;
        const y = 20;
        
        // Background (Arcade style box)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, y, 220, 50);
        
        // Border
        ctx.strokeStyle = '#483D8B'; // DarkSlateBlue
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, 220, 50);
        
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Press Start 2P", cursive';
        ctx.fillText('GENERATORS:', x + 12, y + 22);
        
        // Icons
        const iconSize = 12;
        const iconSpacing = 20;
        const iconsX = x + 12;
        const iconsY = y + 32;
        
        for (let i = 0; i < total; i++) {
            const isActive = i < active;
            ctx.fillStyle = isActive ? '#00ff88' : '#2a2a4a';
            ctx.strokeStyle = isActive ? '#00cc66' : '#483D8B';
            ctx.lineWidth = 2;
            
            ctx.fillRect(iconsX + i * iconSpacing, iconsY, iconSize, iconSize);
            ctx.strokeRect(iconsX + i * iconSpacing, iconsY, iconSize, iconSize);
            
            if (isActive) {
                // Glow
                ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
                ctx.fillRect(iconsX + i * iconSpacing - 2, iconsY - 2, iconSize + 4, iconSize + 4);
            }
        }
        
        // Count text
        ctx.fillStyle = active === total ? '#00ff88' : '#fff';
        ctx.font = '10px "Press Start 2P", cursive';
        ctx.fillText(`${active}/${total}`, x + 160, y + 42);
    }
    
    renderAbilityUI(ctx, player) {
        const x = 20;
        const y = 80;
        
        // If no ability set, don't render
        if (!player.abilityInfo) return;
        
        const abilityColor = player.abilityInfo.color || '#ff9500';
        const abilityName = player.abilityInfo.name.toUpperCase();
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, y, 180, 40);
        
        ctx.strokeStyle = '#483D8B';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, 180, 40);
        
        // Icon (square for arcade feel)
        ctx.fillStyle = player.abilityAvailable ? abilityColor : '#444';
        ctx.fillRect(x + 15, y + 10, 20, 20);
        
        // Ability icon symbol
        ctx.fillStyle = player.abilityAvailable ? '#fff' : '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.abilityInfo.icon, x + 25, y + 25);
        ctx.textAlign = 'left';
        
        // Text
        ctx.fillStyle = player.abilityAvailable ? '#fff' : '#888';
        ctx.font = '10px "Press Start 2P", cursive';
        ctx.fillText(`[Q] ${abilityName}`, x + 45, y + 25);
        
        // Cooldown overlay
        if (!player.abilityAvailable && player.abilityInfo.cooldown > 0) {
            const cooldownProgress = player.abilityCooldown / player.abilityInfo.cooldown;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x + 15, y + 10 + (20 * (1 - cooldownProgress)), 20, 20 * cooldownProgress);
            
            ctx.strokeStyle = abilityColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 15, y + 10, 20, 20);
        }
        
        // Active indicator (for duration-based abilities)
        if (player.isSurging || player.isPulsing) {
            ctx.strokeStyle = abilityColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x - 2, y - 2, 184, 44);
            ctx.setLineDash([]);
        }
    }
    
    renderMinimap(ctx, gameState) {
        const { map, player, monster, generators, exit, doors } = gameState;
        const isPulsing = player.isPulsing;
        const pulseAlpha = isPulsing ? (player.pulseFlashAlpha || 0) : 0;
        
        const minimapWidth = 120;
        const minimapHeight = 75;
        const x = CONFIG.CANVAS_WIDTH - minimapWidth - 20;
        const y = 20;
        
        const scaleX = minimapWidth / (map.width * CONFIG.TILE_SIZE);
        const scaleY = minimapHeight / (map.height * CONFIG.TILE_SIZE);
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(x - 4, y - 4, minimapWidth + 8, minimapHeight + 8);

        // Pulse Background Tint overlay
        if (pulseAlpha > 0) {
            ctx.fillStyle = `rgba(50, 40, 0, ${0.95 * pulseAlpha})`;
            ctx.fillRect(x - 4, y - 4, minimapWidth + 8, minimapHeight + 8);
        }
        
        // Border - Draw normal first, then overlay pulse border
        ctx.strokeStyle = '#483D8B';
        ctx.lineWidth = 4;
        ctx.strokeRect(x - 4, y - 4, minimapWidth + 8, minimapHeight + 8);

        if (pulseAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = pulseAlpha;
            ctx.strokeStyle = '#ffd93d';
            ctx.strokeRect(x - 4, y - 4, minimapWidth + 8, minimapHeight + 8);
            ctx.restore();
        }
        
        // Draw walls
        ctx.fillStyle = '#2a2a4a'; // Dark blue walls
        for (let ty = 0; ty < map.height; ty++) {
            for (let tx = 0; tx < map.width; tx++) {
                if (map.isWall(tx, ty)) {
                    ctx.fillRect(
                        Math.floor(x + tx * (minimapWidth / map.width)),
                        Math.floor(y + ty * (minimapHeight / map.height)),
                        Math.ceil(minimapWidth / map.width),
                        Math.ceil(minimapHeight / map.height)
                    );
                }
            }
        }
        
        // Draw generators (square)
        for (const gen of generators) {
            const isActive = gen.isActive;
            const isRevealedByPulse = pulseAlpha > 0;
            
            if (isActive || isRevealedByPulse) {
                ctx.save();
                if (!isActive && isRevealedByPulse) {
                    ctx.globalAlpha = pulseAlpha;
                }
                
                ctx.fillStyle = isActive ? '#00ff88' : '#666600';
                ctx.fillRect(
                    x + gen.x * scaleX - 2,
                    y + gen.y * scaleY - 2,
                    4, 4
                );
                ctx.restore();
            }
        }
        
        // Draw exit (square)
        const distToExit = Math.sqrt(
            Math.pow(player.x - exit.x, 2) + 
            Math.pow(player.y - exit.y, 2)
        );
        const exitVisible = exit.isUnlocked && distToExit < 200;
        
        if (exitVisible || pulseAlpha > 0) {
            ctx.save();
            if (!exitVisible) {
                ctx.globalAlpha = pulseAlpha;
            }
            
            ctx.fillStyle = exit.isUnlocked ? '#00ff88' : '#666600';
            ctx.fillRect(
                x + exit.x * scaleX - 3,
                y + exit.y * scaleY - 3,
                6, 6
            );
            ctx.restore();
        }
        
        // Draw doors (rect)
        for (const door of doors) {
            // Always Blue (#44aaff) to match new door colors
            ctx.fillStyle = '#44aaff';
            ctx.fillRect(
                x + door.x * scaleX - 2,
                y + door.y * scaleY - 2,
                4, 4
            );
        }
        
        // Draw player (Indigo/Blue square)
        ctx.fillStyle = '#7B68EE'; // MediumSlateBlue
        ctx.fillRect(
            x + player.x * scaleX - 3,
            y + player.y * scaleY - 3,
            6, 6
        );
        
        // Draw monster (Red square)
        const distToMonster = Math.sqrt(
            Math.pow(player.x - monster.x, 2) + 
            Math.pow(player.y - monster.y, 2)
        );
        const monsterVisible = distToMonster < CONFIG.PANIC_DISTANCE * 1.5;
        
        if (monsterVisible || pulseAlpha > 0) {
            ctx.save();
            if (!monsterVisible) {
                ctx.globalAlpha = pulseAlpha;
            }
            
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(
                x + monster.x * scaleX - 3,
                y + monster.y * scaleY - 3,
                6, 6
            );
            ctx.restore();
        }
        
        // Draw pings (Rectangular ripple)
        for (const ping of this.minimapPings) {
            const alpha = ping.life / ping.maxLife;
            const size = 8 + (1 - alpha) * 15;
            
            ctx.strokeStyle = `rgba(123, 104, 238, ${alpha})`; // Indigo ping
            ctx.lineWidth = 2;
            ctx.strokeRect(
                x + ping.x * scaleX - size/2,
                y + ping.y * scaleY - size/2,
                size, size
            );
        }
    }
    
    renderInteractionPrompt(ctx, player) {
        const x = player.x;
        const y = player.y - 50;
        
        ctx.font = '10px "Press Start 2P", cursive';
        const textWidth = ctx.measureText(this.interactionPrompt).width + 20;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - textWidth / 2, y - 15, textWidth, 30);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - textWidth / 2, y - 15, textWidth, 30);
        
        // Text
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(this.interactionPrompt, x, y + 8);
        ctx.textAlign = 'left';
    }
    
    renderPanicUI(ctx, distance) {
        const intensity = 1 - (distance / CONFIG.PANIC_DISTANCE);
        
        // Red vignette
        const gradient = ctx.createRadialGradient(
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, CONFIG.CANVAS_HEIGHT * 0.3,
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, CONFIG.CANVAS_HEIGHT * 0.8
        );
        gradient.addColorStop(0, 'rgba(100, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(100, 0, 0, ${intensity * 0.4})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Heartbeat text (pulsing)
        if (intensity > 0.5) {
            const pulse = Math.sin(performance.now() / 200) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 50, 50, ${intensity * pulse * 0.8})`;
            ctx.font = '20px "Press Start 2P", cursive';
            ctx.textAlign = 'center';
            ctx.fillText('RUN!', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 60);
            ctx.textAlign = 'left';
        }
    }
}
