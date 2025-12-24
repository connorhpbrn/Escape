import { MenuState } from './state/MenuState.js';
import { GameState } from './state/GameState.js';
import { EndState } from './state/EndState.js';
import { PauseState } from './state/PauseState.js';
import { AudioManager } from './audio/AudioManager.js';

// ============================================
// GAME CONSTANTS - EASY TO TWEAK
// ============================================
export const CONFIG = {
    // Canvas
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 800,
    TILE_SIZE: 32,
    
    // Player
    PLAYER_SPEED: 180,
    PLAYER_SIZE: 24,
    
    // Monster
    MONSTER_BASE_SPEED: 100,
    MONSTER_SPEED_INCREMENT: 8,
    MONSTER_SIZE: 28,
    MONSTER_PATH_UPDATE_INTERVAL: 0.25,
    MONSTER_LEAD_TIME: 0.4,
    MONSTER_LOS_DISTANCE: 300,
    MONSTER_MEMORY_DURATION: 3,
    MONSTER_SEARCH_DURATION: 2,
    MONSTER_HEARING_RANGE: 250,
    MONSTER_INVESTIGATION_DURATION: 2,
    
    // Generators
    GENERATOR_COUNT: 5,
    GENERATOR_INTERACT_RADIUS: 50,
    GENERATOR_ACTIVATE_TIME: 1.0,
    
    // Doors
    DOOR_CLOSE_DURATION: 5.0,
    DOOR_COOLDOWN: 8.0,
    DOOR_INTERACT_RADIUS: 40,
    
    // Decoy
    DECOY_LURE_TIME: 5.0,
    DECOY_COOLDOWN: 12,
    
    // Panic
    PANIC_DISTANCE: 180,
    
    // Visual
    VIGNETTE_INTENSITY: 0.4,
    SCREEN_SHAKE_INTENSITY: 8,
    SCREEN_SHAKE_DURATION: 0.5,
};

// ============================================
// SETTINGS (persisted)
// ============================================
export const SETTINGS = {
    sfxEnabled: true,
    musicEnabled: true,
    showMinimapPing: true,
};

// ============================================
// GAME CLASS
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Handle High DPI / Retina displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = CONFIG.CANVAS_WIDTH * dpr;
        this.canvas.height = CONFIG.CANVAS_HEIGHT * dpr;
        this.canvas.style.width = `${CONFIG.CANVAS_WIDTH}px`;
        this.canvas.style.height = `${CONFIG.CANVAS_HEIGHT}px`;
        
        // Scale context to ensure drawing operations match logical coordinates
        this.ctx.scale(dpr, dpr);
        
        // Crisp rendering
        this.ctx.imageSmoothingEnabled = false;
        
        this.states = {};
        this.currentState = null;
        this.lastTime = 0;
        
        this.keys = {};
        this.keysJustPressed = {};
        
        this.audioManager = new AudioManager();
        
        this.screenShake = { x: 0, y: 0, duration: 0, intensity: 0 };
        
        this.checkDesktopOnly();
        this.setupInput();
        this.initStates();
        
        this.changeState('menu');
        
        requestAnimationFrame((t) => this.loop(t));
    }
    
    checkDesktopOnly() {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth < 800 || window.innerHeight < 600;
        
        if (isTouchDevice || isSmallScreen) {
            document.getElementById('desktop-only-overlay').classList.remove('hidden');
        }
        
        window.addEventListener('resize', () => {
            if (window.innerWidth < 800 || window.innerHeight < 600) {
                document.getElementById('desktop-only-overlay').classList.remove('hidden');
            } else if (!('ontouchstart' in window)) {
                document.getElementById('desktop-only-overlay').classList.add('hidden');
            }
        });
    }
    
    setupInput() {
        // Resume audio context on first user interaction
        const resumeAudio = () => {
            this.audioManager.resume();
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);

        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.keysJustPressed[e.code] = true;
            }
            this.keys[e.code] = true;
            
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (this.currentState && this.currentState.onClick) {
                this.currentState.onClick(x, y);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            if (this.currentState && this.currentState.onMouseMove) {
                this.currentState.onMouseMove(this.mouseX, this.mouseY);
            }
        });
    }
    
    initStates() {
        this.states.menu = new MenuState(this);
        this.states.game = new GameState(this);
        this.states.end = new EndState(this);
        this.states.pause = new PauseState(this);
    }
    
    changeState(stateName, data = {}) {
        if (this.currentState && typeof this.currentState.exit === 'function') {
            this.currentState.exit();
        }
        this.currentState = this.states[stateName];
        if (this.currentState && typeof this.currentState.enter === 'function') {
            this.currentState.enter(data);
        }
    }
    
    isKeyPressed(code) {
        return this.keys[code] || false;
    }
    
    isKeyJustPressed(code) {
        return this.keysJustPressed[code] || false;
    }
    
    triggerScreenShake(intensity = CONFIG.SCREEN_SHAKE_INTENSITY, duration = CONFIG.SCREEN_SHAKE_DURATION) {
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
    }
    
    loop(timestamp) {
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        
        // Update screen shake
        if (this.screenShake.duration > 0) {
            this.screenShake.duration -= deltaTime;
            this.screenShake.x = (Math.random() - 0.5) * 2 * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * 2 * this.screenShake.intensity;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
        }
        
        // Update
        if (this.currentState && this.currentState.update) {
            this.currentState.update(deltaTime);
        }
        
        // Render
        this.ctx.save();
        this.ctx.translate(this.screenShake.x, this.screenShake.y);
        
        this.ctx.fillStyle = '#0d0d15';
        this.ctx.fillRect(-10, -10, CONFIG.CANVAS_WIDTH + 20, CONFIG.CANVAS_HEIGHT + 20);
        
        if (this.currentState && this.currentState.render) {
            this.currentState.render(this.ctx);
        }
        
        this.ctx.restore();
        
        // Clear just pressed keys
        this.keysJustPressed = {};
        
        requestAnimationFrame((t) => this.loop(t));
    }
}

// Polyfill for roundRect if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (typeof r === 'number') {
            r = { tl: r, tr: r, br: r, bl: r };
        } else if (Array.isArray(r)) {
            r = { tl: r[0] || 0, tr: r[1] || r[0] || 0, br: r[2] || r[0] || 0, bl: r[3] || r[1] || r[0] || 0 };
        } else {
            r = { tl: 0, tr: 0, br: 0, bl: 0 };
        }
        this.beginPath();
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
        return this;
    };
}

// Start game
window.addEventListener('load', () => {
    window.game = new Game();
});
