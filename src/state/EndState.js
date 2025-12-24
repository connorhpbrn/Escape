import { CONFIG } from '../main.js';

export class EndState {
    constructor(game) {
        this.game = game;
        this.won = false;
        
        this.buttons = [
            {
                id: 'playAgain',
                label: 'Play Again',
                x: CONFIG.CANVAS_WIDTH / 2 - 100,
                y: 400,
                width: 200,
                height: 50,
            },
            {
                id: 'menu',
                label: 'Back to Menu',
                x: CONFIG.CANVAS_WIDTH / 2 - 100,
                y: 465,
                width: 200,
                height: 50,
            },
        ];
        
        this.hoveredButton = null;
        this.animationTime = 0;
        
        // Particles for win state
        this.particles = [];
    }
    
    enter(data) {
        this.won = data.won || false;
        this.customSettings = data.customSettings || null;
        this.extraMode = data.extraMode || null;
        this.endlessLevel = data.endlessLevel || 1;
        this.reverseWin = data.reverseWin || false;
        this.monsterName = data.monsterName || 'The monster';
        this.animationTime = 0;
        this.particles = [];
        
        // Create celebration particles for win
        if (this.won) {
            for (let i = 0; i < 100; i++) {
                this.particles.push({
                    x: Math.random() * CONFIG.CANVAS_WIDTH,
                    y: CONFIG.CANVAS_HEIGHT + Math.random() * 100,
                    vx: (Math.random() - 0.5) * 100,
                    vy: -200 - Math.random() * 300,
                    size: 4 + Math.random() * 8,
                    color: ['#4ecdc4', '#ff6b6b', '#ffeaa7', '#74b9ff', '#a29bfe'][Math.floor(Math.random() * 5)],
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 10,
                });
            }
        }
    }
    
    exit() {}
    
    update(deltaTime) {
        this.animationTime += deltaTime;
        
        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += 200 * deltaTime; // gravity
            p.rotation += p.rotationSpeed * deltaTime;
            return p.y < CONFIG.CANVAS_HEIGHT + 50;
        });
    }
    
    onClick(x, y) {
        for (const btn of this.buttons) {
            if (this.isPointInRect(x, y, btn)) {
                this.game.audioManager.playButtonClick();
                
                if (btn.id === 'playAgain') {
                    this.game.changeState('game', { 
                        customSettings: this.customSettings,
                        extraMode: this.extraMode
                    });
                } else if (btn.id === 'menu') {
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
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
        if (this.won) {
            gradient.addColorStop(0, '#0a2a1a');
            gradient.addColorStop(1, '#1a4a3a');
        } else {
            gradient.addColorStop(0, '#2a0a0a');
            gradient.addColorStop(1, '#4a1a1a');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Particles
        for (const p of this.particles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        }
        
        // Vignette
        const vignette = ctx.createRadialGradient(
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, CONFIG.CANVAS_HEIGHT * 0.3,
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, CONFIG.CANVAS_HEIGHT * 0.9
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Title
        const titleY = 200 + Math.sin(this.animationTime * 2) * 5;
        
        ctx.textAlign = 'center';
        
        if (this.won) {
            // Win title
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.font = '48px "Press Start 2P", cursive';
            
            const winTitle = this.reverseWin ? 'CAUGHT!' : 'ESCAPED!';
            ctx.fillText(winTitle, CONFIG.CANVAS_WIDTH / 2 + 4, titleY + 4);
            
            const titleGradient = ctx.createLinearGradient(
                CONFIG.CANVAS_WIDTH / 2 - 200, titleY - 40,
                CONFIG.CANVAS_WIDTH / 2 + 200, titleY + 40
            );
            
            if (this.reverseWin) {
                titleGradient.addColorStop(0, '#c0392b');
                titleGradient.addColorStop(0.5, '#ff6b6b');
                titleGradient.addColorStop(1, '#c0392b');
            } else {
                titleGradient.addColorStop(0, '#4ecdc4');
                titleGradient.addColorStop(0.5, '#00ff88');
                titleGradient.addColorStop(1, '#4ecdc4');
            }
            
            ctx.fillStyle = titleGradient;
            ctx.fillText(winTitle, CONFIG.CANVAS_WIDTH / 2, titleY);
            
            // Subtitle
            ctx.fillStyle = '#aaa';
            ctx.font = '16px "Press Start 2P", cursive';
            const winSubtitle = this.reverseWin ? 'You caught the survivor!' : 'You made it out alive!';
            ctx.fillText(winSubtitle, CONFIG.CANVAS_WIDTH / 2, titleY + 60);
        } else {
            // Lose title - different for reverse mode
            const isReverseLose = this.extraMode === 'reverse';
            const loseTitle = isReverseLose ? 'ESCAPED!' : 'CAUGHT!';
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.font = '48px "Press Start 2P", cursive';
            ctx.fillText(loseTitle, CONFIG.CANVAS_WIDTH / 2 + 4, titleY + 4);
            
            const titleGradient = ctx.createLinearGradient(
                CONFIG.CANVAS_WIDTH / 2 - 200, titleY - 40,
                CONFIG.CANVAS_WIDTH / 2 + 200, titleY + 40
            );
            titleGradient.addColorStop(0, '#c0392b');
            titleGradient.addColorStop(0.5, '#ff6b6b');
            titleGradient.addColorStop(1, '#c0392b');
            
            ctx.fillStyle = titleGradient;
            ctx.fillText(loseTitle, CONFIG.CANVAS_WIDTH / 2, titleY);
            
            // Subtitle
            ctx.fillStyle = '#aaa';
            ctx.font = '16px "Press Start 2P", cursive';
            const loseSubtitle = isReverseLose ? 'The survivor escaped!' : `${this.monsterName} got you...`;
            ctx.fillText(loseSubtitle, CONFIG.CANVAS_WIDTH / 2, titleY + 60);
            
            // Show endless level if in endless mode
            if (this.extraMode === 'endless') {
                ctx.fillStyle = '#00ff88';
                ctx.font = '14px "Press Start 2P", cursive';
                ctx.fillText(`You reached Level ${this.endlessLevel}`, CONFIG.CANVAS_WIDTH / 2, titleY + 100);
            }
        }
        
        // Buttons
        for (const btn of this.buttons) {
            const isHovered = this.hoveredButton === btn.id;
            
            // Button shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(btn.x + 4, btn.y + 4, btn.width, btn.height);
            
            // Button background
            ctx.fillStyle = isHovered ? '#483D8B' : '#2a2a4a';
            ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
            
            // Button border
            ctx.strokeStyle = isHovered ? '#7B68EE' : '#483D8B';
            ctx.lineWidth = 4;
            ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
            
            // Button text
            ctx.fillStyle = isHovered ? '#fff' : '#ccc';
            ctx.font = '12px "Press Start 2P", cursive';
            ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);
            
            // Selection arrow
            if (isHovered) {
                ctx.fillStyle = '#7B68EE';
                ctx.fillText('>', btn.x - 20, btn.y + btn.height / 2 + 6);
                ctx.fillText('<', btn.x + btn.width + 20, btn.y + btn.height / 2 + 6);
            }
        }
        
        ctx.textAlign = 'left';
    }
}
