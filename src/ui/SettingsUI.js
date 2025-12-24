import { CONFIG, SETTINGS } from '../main.js';

export class SettingsUI {
    constructor() {
        this.visible = false;
        this.hoveredButton = null;
        
        this.buttons = [];
        this.sliders = [];
        
        this.initControls();
    }
    
    initControls() {
        const panelWidth = 500;
        const panelHeight = 450;
        const panelX = (CONFIG.CANVAS_WIDTH - panelWidth) / 2;
        const panelY = (CONFIG.CANVAS_HEIGHT - panelHeight) / 2;
        
        this.panel = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };
        
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const startY = panelY + 110;
        const spacing = 70;
        
        // Toggle buttons
        this.buttons = [
            {
                id: 'sfx',
                label: 'Sound Effects',
                x: centerX - 150,
                y: startY,
                width: 300,
                height: 45,
                getValue: () => SETTINGS.sfxEnabled,
                toggle: () => { SETTINGS.sfxEnabled = !SETTINGS.sfxEnabled; }
            },
            {
                id: 'music',
                label: 'Music',
                x: centerX - 150,
                y: startY + spacing,
                width: 300,
                height: 45,
                getValue: () => SETTINGS.musicEnabled,
                toggle: () => { SETTINGS.musicEnabled = !SETTINGS.musicEnabled; }
            },
            {
                id: 'minimap',
                label: 'Show Minimap',
                x: centerX - 150,
                y: startY + spacing * 2,
                width: 300,
                height: 45,
                getValue: () => SETTINGS.showMinimapPing,
                toggle: () => { SETTINGS.showMinimapPing = !SETTINGS.showMinimapPing; }
            },
        ];
        
        // No sliders needed anymore
        this.sliders = [];
        
        // Back button
        this.backButton = {
            id: 'back',
            label: 'Back',
            x: centerX - 80,
            y: panelY + panelHeight - 80,
            width: 160,
            height: 50,
        };
    }
    
    show() {
        this.visible = true;
    }
    
    hide() {
        this.visible = false;
    }
    
    onMouseMove(x, y, audioManager) {
        if (!this.visible) return;
        
        const prevHovered = this.hoveredButton;
        this.hoveredButton = null;
        
        for (const btn of this.buttons) {
            if (this.isPointInRect(x, y, btn)) {
                this.hoveredButton = btn.id;
                if (prevHovered !== btn.id && audioManager) {
                    audioManager.playButtonHover();
                }
                return;
            }
        }
        
        if (this.isPointInRect(x, y, this.backButton)) {
            this.hoveredButton = 'back';
            if (prevHovered !== 'back' && audioManager) {
                audioManager.playButtonHover();
            }
        }
        
        // Handle slider dragging
        for (const slider of this.sliders) {
            if (slider.dragging) {
                const sliderX = slider.x + 10;
                const sliderWidth = slider.width - 20;
                const t = Math.max(0, Math.min(1, (x - sliderX) / sliderWidth));
                slider.setValue(slider.min + t * (slider.max - slider.min));
            }
        }
    }
    
    onClick(x, y, game) {
        if (!this.visible) return false;
        
        for (const btn of this.buttons) {
            if (this.isPointInRect(x, y, btn)) {
                btn.toggle();
                game.audioManager.playButtonClick();
                
                // Handle specific toggle side effects
                if (btn.id === 'music') {
                    game.audioManager.updateMusicState();
                }
                
                return true;
            }
        }
        
        for (const slider of this.sliders) {
            if (this.isPointInRect(x, y, slider)) {
                const sliderX = slider.x + 10;
                const sliderWidth = slider.width - 20;
                const t = Math.max(0, Math.min(1, (x - sliderX) / sliderWidth));
                slider.setValue(slider.min + t * (slider.max - slider.min));
                game.audioManager.playButtonClick();
                return true;
            }
        }
        
        if (this.isPointInRect(x, y, this.backButton)) {
            game.audioManager.playButtonClick();
            this.hide();
            return true;
        }
        
        return false;
    }
    
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
    }
    
    render(ctx) {
        if (!this.visible) return;
        
        // Overlay (dimmed to show blur)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Panel Background
        ctx.fillStyle = '#141423'; // Darker arcade background
        ctx.fillRect(this.panel.x, this.panel.y, this.panel.width, this.panel.height);
        
        // Panel Border
        ctx.strokeStyle = '#483D8B';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.panel.x, this.panel.y, this.panel.width, this.panel.height);
        
        // Title
        ctx.fillStyle = '#fff';
        ctx.font = '24px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('SETTINGS', CONFIG.CANVAS_WIDTH / 2, this.panel.y + 60);
        
        // Toggle buttons
        for (const btn of this.buttons) {
            const isHovered = this.hoveredButton === btn.id;
            const isOn = btn.getValue();
            
            // Background
            ctx.fillStyle = isHovered ? '#2a2a4a' : '#1a1a2e';
            ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
            
            ctx.strokeStyle = isHovered ? '#7B68EE' : '#483D8B';
            ctx.lineWidth = 4;
            ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
            
            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Press Start 2P", cursive';
            ctx.textAlign = 'left';
            ctx.fillText(btn.label, btn.x + 15, btn.y + 28);
            
            // Toggle indicator
            const toggleX = btn.x + btn.width - 60;
            const toggleY = btn.y + btn.height / 2;
            
            // Toggle track
            ctx.fillStyle = isOn ? '#00ff88' : '#ff4444';
            ctx.fillRect(toggleX, toggleY - 12, 45, 24);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(toggleX, toggleY - 12, 45, 24);
            
            // Toggle knob (square)
            ctx.fillStyle = '#fff';
            ctx.fillRect(toggleX + (isOn ? 25 : 4), toggleY - 8, 16, 16);
        }
        
        // Sliders
        for (const slider of this.sliders) {
            // Background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(slider.x, slider.y, slider.width, slider.height);
            
            ctx.strokeStyle = '#483D8B';
            ctx.lineWidth = 4;
            ctx.strokeRect(slider.x, slider.y, slider.width, slider.height);
            
            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Press Start 2P", cursive';
            ctx.textAlign = 'left';
            ctx.fillText(slider.label, slider.x + 15, slider.y + 20);
            
            // Slider track
            const trackX = slider.x + 15;
            const trackY = slider.y + 32;
            const trackWidth = slider.width - 30;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(trackX, trackY - 4, trackWidth, 8);
            
            // Slider fill
            const value = slider.getValue();
            const t = (value - slider.min) / (slider.max - slider.min);
            
            ctx.fillStyle = '#7B68EE';
            ctx.fillRect(trackX, trackY - 4, trackWidth * t, 8);
            
            // Slider handle (square)
            ctx.fillStyle = '#fff';
            ctx.fillRect(trackX + trackWidth * t - 8, trackY - 8, 16, 16);
            
            // Value text
            ctx.fillStyle = '#aaa';
            ctx.font = '10px "Press Start 2P", cursive';
            ctx.textAlign = 'right';
            ctx.fillText(`${value.toFixed(1)}x`, slider.x + slider.width - 15, slider.y + 20);
        }
        
        // Back button
        const isBackHovered = this.hoveredButton === 'back';
        
        // Button shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.backButton.x + 4, this.backButton.y + 4, this.backButton.width, this.backButton.height);
        
        ctx.fillStyle = isBackHovered ? '#483D8B' : '#2a2a4a';
        ctx.fillRect(this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height);
        
        ctx.strokeStyle = isBackHovered ? '#7B68EE' : '#483D8B';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.backButton.x, this.backButton.y, this.backButton.width, this.backButton.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText(this.backButton.label, this.backButton.x + this.backButton.width / 2, this.backButton.y + 32);
        
        ctx.textAlign = 'left';
    }
}
