import { CONFIG } from '../main.js';

// ============================================
// EXTRA MENU UI
// Special game modes: Endless, Nightmare, Reverse, Mirror
// ============================================

export const EXTRA_MODES = {
    ENDLESS: {
        id: 'endless',
        name: 'Endless',
        description: 'Escape maps back-to-back. No breaks.',
        color: '#00ff88'
    },
    NIGHTMARE: {
        id: 'nightmare',
        name: 'Nightmare',
        description: 'All monsters spawn at once. Good luck.',
        color: '#ff4444'
    },
    REVERSE: {
        id: 'reverse',
        name: 'Reverse',
        description: 'Play as the Kraken. Hunt the player.',
        color: '#00bbffff'
    },
    MIRROR: {
        id: 'mirror',
        name: 'Mirror',
        description: 'Flipped map. Reversed controls.',
        color: '#ffd700'
    }
};

export class ExtraMenuUI {
    constructor() {
        this.visible = false;
        this.hoveredButton = null;
        
        // UI dimensions
        this.panelWidth = 500;
        this.panelHeight = 460;
        this.panelX = (CONFIG.CANVAS_WIDTH - this.panelWidth) / 2;
        this.panelY = (CONFIG.CANVAS_HEIGHT - this.panelHeight) / 2;
        
        this.setupButtons();
    }
    
    setupButtons() {
        const modes = Object.values(EXTRA_MODES);
        const btnWidth = 400;
        const btnHeight = 50;
        const startY = this.panelY + 110;
        const spacing = 65;
        
        this.modeButtons = modes.map((mode, i) => ({
            id: mode.id,
            label: mode.name,
            description: mode.description,
            color: mode.color,
            x: this.panelX + (this.panelWidth - btnWidth) / 2,
            y: startY + i * spacing,
            width: btnWidth,
            height: btnHeight
        }));
        
        // Back button
        this.backButton = {
            id: 'back',
            label: 'Back',
            x: this.panelX + (this.panelWidth - 160) / 2,
            y: this.panelY + this.panelHeight - 70,
            width: 160,
            height: 45
        };
    }
    
    show() {
        this.visible = true;
    }
    
    hide() {
        this.visible = false;
    }
    
    onMouseMove(x, y) {
        if (!this.visible) return false;
        
        const prevHovered = this.hoveredButton;
        this.hoveredButton = null;
        
        for (const btn of this.modeButtons) {
            if (this.isPointInRect(x, y, btn)) {
                this.hoveredButton = btn.id;
                return prevHovered !== btn.id;
            }
        }
        
        if (this.isPointInRect(x, y, this.backButton)) {
            this.hoveredButton = 'back';
            return prevHovered !== 'back';
        }
        
        return false;
    }
    
    onClick(x, y, game) {
        if (!this.visible) return null;
        
        // Check mode buttons
        for (const btn of this.modeButtons) {
            if (this.isPointInRect(x, y, btn)) {
                game.audioManager.playButtonClick();
                return btn.id; // Return mode id
            }
        }
        
        // Check back button
        if (this.isPointInRect(x, y, this.backButton)) {
            game.audioManager.playButtonClick();
            this.hide();
            return 'back';
        }
        
        return null;
    }
    
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
    }
    
    render(ctx) {
        if (!this.visible) return;
        
        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Panel background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(this.panelX, this.panelY, this.panelWidth, this.panelHeight);
        
        // Panel border
        ctx.strokeStyle = '#7B68EE';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.panelX, this.panelY, this.panelWidth, this.panelHeight);
        
        // Title
        ctx.fillStyle = '#fff';
        ctx.font = '24px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('EXTRA MODES', CONFIG.CANVAS_WIDTH / 2, this.panelY + 60);
        
        // Mode buttons
        for (const btn of this.modeButtons) {
            const isHovered = this.hoveredButton === btn.id;
            
            // Button shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(btn.x + 3, btn.y + 3, btn.width, btn.height);
            
            // Button background
            ctx.fillStyle = isHovered ? '#3a3a5a' : '#2a2a4a';
            ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
            
            // Button border with mode color
            ctx.strokeStyle = isHovered ? btn.color : '#483D8B';
            ctx.lineWidth = 3;
            ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
            
            // Mode name
            ctx.fillStyle = isHovered ? btn.color : '#aaa';
            ctx.font = '14px "Press Start 2P", cursive';
            ctx.textAlign = 'left';
            ctx.fillText(btn.label, btn.x + 15, btn.y + 22);
            
            // Description
            ctx.fillStyle = isHovered ? '#ccc' : '#666';
            ctx.font = '8px "Press Start 2P", cursive';
            ctx.fillText(btn.description, btn.x + 15, btn.y + 40);
            
            // Selection indicator
            if (isHovered) {
                ctx.fillStyle = btn.color;
                ctx.font = '14px "Press Start 2P", cursive';
                ctx.textAlign = 'right';
                ctx.fillText('>', btn.x + btn.width - 15, btn.y + 30);
            }
        }
        
        // Back button
        const backHovered = this.hoveredButton === 'back';
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.backButton.x + 3, this.backButton.y + 3, this.backButton.width, this.backButton.height);
        
        ctx.fillStyle = backHovered ? '#483D8B' : '#2a2a4a';
        ctx.fillRect(this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height);
        
        ctx.strokeStyle = backHovered ? '#7B68EE' : '#483D8B';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height);
        
        ctx.fillStyle = backHovered ? '#fff' : '#aaa';
        ctx.font = '12px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('Back', this.backButton.x + this.backButton.width / 2, this.backButton.y + 28);
        
        ctx.textAlign = 'left';
    }
}
