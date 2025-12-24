import { CONFIG } from '../main.js';
import { SettingsUI } from '../ui/SettingsUI.js';
import { CustomGameUI } from '../ui/CustomGameUI.js';
import { ExtraMenuUI } from '../ui/ExtraMenuUI.js';

export class MenuState {
    constructor(game) {
        this.game = game;
        this.settingsUI = new SettingsUI();
        this.customGameUI = new CustomGameUI();
        this.extraMenuUI = new ExtraMenuUI();
        
        this.buttons = [
            {
                id: 'play',
                label: 'Play',
                x: CONFIG.CANVAS_WIDTH / 2 - 100,
                y: 320,
                width: 200,
                height: 50,
            },
            {
                id: 'custom',
                label: 'Custom',
                x: CONFIG.CANVAS_WIDTH / 2 - 100,
                y: 388,
                width: 200,
                height: 50,
            },
            {
                id: 'extra',
                label: 'Extra',
                x: CONFIG.CANVAS_WIDTH / 2 - 100,
                y: 456,
                width: 200,
                height: 50,
            },
            {
                id: 'settings',
                label: 'Settings',
                x: CONFIG.CANVAS_WIDTH / 2 - 100,
                y: 524,
                width: 200,
                height: 50,
            },
        ];
        
        this.hoveredButton = null;
        this.titlePulse = 0;
        
        // Background particles
        this.particles = [];
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: Math.random() * CONFIG.CANVAS_HEIGHT,
                size: 1 + Math.random() * 2,
                speed: 10 + Math.random() * 20,
                alpha: 0.2 + Math.random() * 0.3,
            });
        }
    }
    
    enter() {
        this.settingsUI.hide();
        this.customGameUI.hide();
        this.extraMenuUI.hide();
        this.game.audioManager.startMusic();
    }
    
    exit() {
        // Don't stop music so it continues into the game
    }
    
    update(deltaTime) {
        this.titlePulse += deltaTime * 2;
        
        // Update particles
        for (const p of this.particles) {
            p.y += p.speed * deltaTime;
            if (p.y > CONFIG.CANVAS_HEIGHT) {
                p.y = -10;
                p.x = Math.random() * CONFIG.CANVAS_WIDTH;
            }
        }
        
        if (this.customGameUI.visible) {
            this.customGameUI.onMouseMove(this.game.mouseX || 0, this.game.mouseY || 0);
        } else if (this.extraMenuUI.visible) {
            this.extraMenuUI.onMouseMove(this.game.mouseX || 0, this.game.mouseY || 0);
        } else {
            this.settingsUI.onMouseMove(this.game.mouseX || 0, this.game.mouseY || 0, this.game.audioManager);
        }
    }
    
    onClick(x, y) {
        // Check custom game UI first
        if (this.customGameUI.visible) {
            const result = this.customGameUI.onClick(x, y, this.game);
            if (result === 'start') {
                const settings = this.customGameUI.getSettings();
                this.game.changeState('game', { customSettings: settings });
            }
            return;
        }
        
        // Check extra menu UI
        if (this.extraMenuUI.visible) {
            const result = this.extraMenuUI.onClick(x, y, this.game);
            if (result && result !== 'back') {
                // Start game with extra mode
                this.game.changeState('game', { extraMode: result });
            }
            return;
        }
        
        // Check settings UI
        if (this.settingsUI.visible) {
            this.settingsUI.onClick(x, y, this.game);
            return;
        }
        
        for (const btn of this.buttons) {
            if (this.isPointInRect(x, y, btn)) {
                this.game.audioManager.playButtonClick();
                
                if (btn.id === 'play') {
                    this.game.changeState('game');
                } else if (btn.id === 'custom') {
                    this.customGameUI.show();
                } else if (btn.id === 'extra') {
                    this.extraMenuUI.show();
                } else if (btn.id === 'settings') {
                    this.settingsUI.show();
                }
                return;
            }
        }
    }
    
    onMouseMove(x, y) {
        if (this.customGameUI.visible) {
            if (this.customGameUI.onMouseMove(x, y)) {
                this.game.audioManager.playButtonHover();
            }
            return;
        }
        
        if (this.extraMenuUI.visible) {
            if (this.extraMenuUI.onMouseMove(x, y)) {
                this.game.audioManager.playButtonHover();
            }
            return;
        }
        
        if (this.settingsUI.visible) {
            this.settingsUI.onMouseMove(x, y, this.game.audioManager);
            return;
        }
        
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
        if (this.customGameUI.visible) {
            if (!this.blurredBackground) {
                this.createBlurredBackground();
            }
            ctx.drawImage(this.blurredBackground, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            this.customGameUI.render(ctx);
            return;
        }
        
        if (this.extraMenuUI.visible) {
            if (!this.blurredBackground) {
                this.createBlurredBackground();
            }
            ctx.drawImage(this.blurredBackground, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            this.extraMenuUI.render(ctx);
            return;
        }
        
        if (this.settingsUI.visible) {
            if (!this.blurredBackground) {
                this.createBlurredBackground();
            }
            ctx.drawImage(this.blurredBackground, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            this.settingsUI.render(ctx);
            return;
        }
        
        // Clear cache when not in overlay
        this.blurredBackground = null;
        
        this.renderScene(ctx);
    }
    
    createBlurredBackground() {
        // Create offscreen canvas for the scene
        const offscreen = document.createElement('canvas');
        offscreen.width = CONFIG.CANVAS_WIDTH;
        offscreen.height = CONFIG.CANVAS_HEIGHT;
        const ctx = offscreen.getContext('2d');
        
        // Render current scene
        this.renderScene(ctx);
        
        // Create final canvas with blur
        const blurred = document.createElement('canvas');
        blurred.width = CONFIG.CANVAS_WIDTH;
        blurred.height = CONFIG.CANVAS_HEIGHT;
        const bCtx = blurred.getContext('2d');
        bCtx.filter = 'blur(8px)';
        bCtx.drawImage(offscreen, 0, 0);
        
        this.blurredBackground = blurred;
    }
    
    renderScene(ctx) {
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, '#0a0a15');
        gradient.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Particles
        for (const p of this.particles) {
            ctx.fillStyle = `rgba(100, 100, 150, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Vignette
        const vignette = ctx.createRadialGradient(
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, CONFIG.CANVAS_HEIGHT * 0.3,
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, CONFIG.CANVAS_HEIGHT * 0.9
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Title
        const titleY = 200 + Math.sin(this.titlePulse) * 5;
        
        // Title shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = '40px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('ESCAPE THE FACILITY', CONFIG.CANVAS_WIDTH / 2 + 4, titleY + 4);
        
        // Title gradient
        const titleGradient = ctx.createLinearGradient(
            CONFIG.CANVAS_WIDTH / 2 - 300, titleY - 40,
            CONFIG.CANVAS_WIDTH / 2 + 300, titleY + 40
        );
        titleGradient.addColorStop(0, '#6A5ACD'); // SlateBlue
        titleGradient.addColorStop(0.5, '#7B68EE'); // MediumSlateBlue
        titleGradient.addColorStop(1, '#6A5ACD');
        
        ctx.fillStyle = titleGradient;
        ctx.fillText('ESCAPE THE FACILITY', CONFIG.CANVAS_WIDTH / 2, titleY);
        
        // Subtitle
        ctx.fillStyle = '#888';
        ctx.font = '12px "Press Start 2P", cursive';
        ctx.fillText('Activate all generators. Avoid the monster. Escape.', CONFIG.CANVAS_WIDTH / 2, titleY + 60);
        
        // Buttons
        for (const btn of this.buttons) {
            const isHovered = this.hoveredButton === btn.id;
            
            // Button shadow (hard pixel shadow)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(btn.x + 4, btn.y + 4, btn.width, btn.height);
            
            // Button background
            ctx.fillStyle = isHovered ? '#483D8B' : '#2a2a4a'; // DarkSlateBlue : Dark Blue-Grey
            ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
            
            // Button border (pixel style)
            ctx.strokeStyle = isHovered ? '#7B68EE' : '#483D8B';
            ctx.lineWidth = 4;
            ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
            
            // Button text
            ctx.fillStyle = isHovered ? '#fff' : '#aaa';
            ctx.font = '16px "Press Start 2P", cursive';
            ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);
            
            // Selection arrow if hovered
            if (isHovered) {
                ctx.fillStyle = '#7B68EE';
                ctx.fillText('>', btn.x - 20, btn.y + btn.height / 2 + 6);
                ctx.fillText('<', btn.x + btn.width + 20, btn.y + btn.height / 2 + 6);
            }
        }
        
        // Controls hint
        ctx.fillStyle = '#555';
        ctx.font = '10px "Press Start 2P", cursive';
        ctx.fillText('WASD to move • E to interact • Q for decoy • ESC to pause', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 40);
        
        ctx.textAlign = 'left';
    }
}
