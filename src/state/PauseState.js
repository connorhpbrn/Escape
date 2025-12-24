import { CONFIG } from '../main.js';

export class PauseState {
    constructor(game) {
        this.game = game;
        this.previousState = null;
        
        this.buttons = [
            {
                id: 'resume',
                label: 'Resume',
                x: CONFIG.CANVAS_WIDTH / 2 - 100,
                y: 320,
                width: 200,
                height: 50,
            },
            {
                id: 'restart',
                label: 'Restart',
                x: CONFIG.CANVAS_WIDTH / 2 - 100,
                y: 400,
                width: 200,
                height: 50,
            },
            {
                id: 'quit',
                label: 'Quit to Menu',
                x: CONFIG.CANVAS_WIDTH / 2 - 100,
                y: 480,
                width: 200,
                height: 50,
            },
        ];
        
        this.hoveredButton = null;
    }
    
    enter(data) {
        this.previousState = data.previousState || 'game';
    }
    
    exit() {}
    
    update(deltaTime) {
        // Resume on ESC
        if (this.game.isKeyJustPressed('Escape')) {
            // Resume without reinitializing
            this.game.currentState = this.game.states.game;
        }
    }
    
    onClick(x, y) {
        for (const btn of this.buttons) {
            if (this.isPointInRect(x, y, btn)) {
                this.game.audioManager.playButtonClick();
                
                if (btn.id === 'resume') {
                    // Resume without reinitializing
                    this.game.currentState = this.game.states.game;
                } else if (btn.id === 'restart') {
                    // Preserve custom settings and extra mode
                    const customSettings = this.game.states.game.customSettings;
                    const extraMode = this.game.states.game.extraMode;
                    this.game.changeState('game', { customSettings, extraMode });
                } else if (btn.id === 'quit') {
                    this.game.changeState('menu');
                }
                return;
            }
        }
    }
    
    onMouseMove(x, y) {
        const prevHovered = this.hoveredButton;
        this.hoveredButton = null;
        
        for (const btn of this.buttons) {
            if (this.isPointInRect(x, y, btn)) {
                this.hoveredButton = btn.id;
                if (prevHovered !== btn.id) {
                    this.game.audioManager.playButtonHover();
                }
                return;
            }
        }
    }
    
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
    }
    
    render(ctx) {
        // Render game state behind (dimmed)
        if (this.game.states.game) {
            this.game.states.game.render(ctx);
        }
        
        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Pause panel
        const panelWidth = 400;
        const panelHeight = 350;
        const panelX = (CONFIG.CANVAS_WIDTH - panelWidth) / 2;
        const panelY = (CONFIG.CANVAS_HEIGHT - panelHeight) / 2;
        
        ctx.fillStyle = '#141423'; // Darker arcade background matching Settings
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        ctx.strokeStyle = '#483D8B'; // Border
        ctx.lineWidth = 4;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Title
        ctx.fillStyle = '#fff';
        ctx.font = '24px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', CONFIG.CANVAS_WIDTH / 2, panelY + 60);
        
        // Buttons
        for (const btn of this.buttons) {
            const isHovered = this.hoveredButton === btn.id;
            
            // Button shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(btn.x + 4, btn.y + 4, btn.width, btn.height);
            
            // Button background - Match SettingsUI Back button style
            ctx.fillStyle = isHovered ? '#483D8B' : '#2a2a4a';
            ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
            
            ctx.strokeStyle = isHovered ? '#7B68EE' : '#483D8B';
            ctx.lineWidth = 4;
            ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
            
            // Button text
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Press Start 2P", cursive';
            ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);
            
            // Selection arrow
            if (isHovered) {
                ctx.fillStyle = '#7B68EE';
                ctx.fillText('>', btn.x - 20, btn.y + btn.height / 2 + 6);
                ctx.fillText('<', btn.x + btn.width + 20, btn.y + btn.height / 2 + 6);
            }
        }
        
        // Hint
        ctx.fillStyle = '#666';
        ctx.font = '10px "Press Start 2P", cursive';
        ctx.fillText('Press ESC to resume', CONFIG.CANVAS_WIDTH / 2, panelY + panelHeight - 20);
        
        ctx.textAlign = 'left';
    }
}
