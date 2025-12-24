import { CONFIG } from '../main.js';
import { MAPS } from '../world/Map.js';
import { getMonsterTypes, getMonsterInfo } from '../entities/monsters/MonsterFactory.js';
import { getAbilityTypes, getAbilityInfo } from '../entities/AbilityFactory.js';

// ============================================
// CUSTOM GAME UI
// Allows player to select map, ability, monster, and generator count
// ============================================

export class CustomGameUI {
    constructor() {
        this.visible = false;
        
        // Selection state
        this.selectedMapIndex = 0;
        this.selectedAbilityIndex = 0;
        this.selectedMonsterIndex = 0;
        this.generatorCount = 5;
        
        // Available options
        this.maps = MAPS.map((m, i) => ({ index: i, name: m.name, config: m }));
        this.abilityTypes = getAbilityTypes();
        this.monsterTypes = getMonsterTypes();
        
        // UI dimensions
        this.panelWidth = 500;
        this.panelHeight = 490; // Increased height for ability row
        this.panelX = (CONFIG.CANVAS_WIDTH - this.panelWidth) / 2;
        this.panelY = (CONFIG.CANVAS_HEIGHT - this.panelHeight) / 2;
        
        // Buttons
        this.buttons = [];
        this.hoveredButton = null;
        
        this.setupButtons();
    }
    
    setupButtons() {
        const btnWidth = 40;
        const btnHeight = 35;
        const rowY = this.panelY + 110; // Increased to 110 for perfect symmetry
        const rowSpacing = 80;
        
        // Map selection arrows
        this.buttons = [
            {
                id: 'map_prev',
                x: this.panelX + 50,
                y: rowY,
                width: btnWidth,
                height: btnHeight,
                label: '<'
            },
            {
                id: 'map_next',
                x: this.panelX + this.panelWidth - 90,
                y: rowY,
                width: btnWidth,
                height: btnHeight,
                label: '>'
            },
            // Ability selection arrows (below map, above monster)
            {
                id: 'ability_prev',
                x: this.panelX + 50,
                y: rowY + rowSpacing,
                width: btnWidth,
                height: btnHeight,
                label: '<'
            },
            {
                id: 'ability_next',
                x: this.panelX + this.panelWidth - 90,
                y: rowY + rowSpacing,
                width: btnWidth,
                height: btnHeight,
                label: '>'
            },
            // Monster selection arrows
            {
                id: 'monster_prev',
                x: this.panelX + 50,
                y: rowY + rowSpacing * 2,
                width: btnWidth,
                height: btnHeight,
                label: '<'
            },
            {
                id: 'monster_next',
                x: this.panelX + this.panelWidth - 90,
                y: rowY + rowSpacing * 2,
                width: btnWidth,
                height: btnHeight,
                label: '>'
            },
            // Generator count arrows
            {
                id: 'gen_prev',
                x: this.panelX + 50,
                y: rowY + rowSpacing * 3,
                width: btnWidth,
                height: btnHeight,
                label: '<'
            },
            {
                id: 'gen_next',
                x: this.panelX + this.panelWidth - 90,
                y: rowY + rowSpacing * 3,
                width: btnWidth,
                height: btnHeight,
                label: '>'
            },
            // Start and Back buttons
            {
                id: 'start',
                x: this.panelX + this.panelWidth / 2 - 100,
                y: this.panelY + this.panelHeight - 80,
                width: 200,
                height: 50,
                label: 'Start Game'
            },
            {
                id: 'back',
                x: this.panelX + 20,
                y: this.panelY + 20,
                width: 80,
                height: 35,
                label: 'Back'
            }
        ];
    }
    
    show() {
        this.visible = true;
        this.hoveredButton = null;
    }
    
    hide() {
        this.visible = false;
    }
    
    getSettings() {
        return {
            mapConfig: this.maps[this.selectedMapIndex].config,
            abilityType: this.abilityTypes[this.selectedAbilityIndex],
            monsterType: this.monsterTypes[this.selectedMonsterIndex],
            generatorCount: this.generatorCount
        };
    }
    
    onClick(x, y, game) {
        for (const btn of this.buttons) {
            if (this.isPointInRect(x, y, btn)) {
                game.audioManager.playButtonClick();
                
                switch (btn.id) {
                    case 'map_prev':
                        this.selectedMapIndex = (this.selectedMapIndex - 1 + this.maps.length) % this.maps.length;
                        break;
                    case 'map_next':
                        this.selectedMapIndex = (this.selectedMapIndex + 1) % this.maps.length;
                        break;
                    case 'ability_prev':
                        this.selectedAbilityIndex = (this.selectedAbilityIndex - 1 + this.abilityTypes.length) % this.abilityTypes.length;
                        break;
                    case 'ability_next':
                        this.selectedAbilityIndex = (this.selectedAbilityIndex + 1) % this.abilityTypes.length;
                        break;
                    case 'monster_prev':
                        this.selectedMonsterIndex = (this.selectedMonsterIndex - 1 + this.monsterTypes.length) % this.monsterTypes.length;
                        break;
                    case 'monster_next':
                        this.selectedMonsterIndex = (this.selectedMonsterIndex + 1) % this.monsterTypes.length;
                        break;
                    case 'gen_prev':
                        this.generatorCount = Math.max(1, this.generatorCount - 1);
                        break;
                    case 'gen_next':
                        this.generatorCount = Math.min(5, this.generatorCount + 1);
                        break;
                    case 'start':
                        return 'start';
                    case 'back':
                        this.hide();
                        return 'back';
                }
                return null;
            }
        }
        return null;
    }
    
    onMouseMove(x, y) {
        const prevHovered = this.hoveredButton;
        this.hoveredButton = null;
        
        for (const btn of this.buttons) {
            if (this.isPointInRect(x, y, btn)) {
                this.hoveredButton = btn.id;
                return prevHovered !== btn.id;
            }
        }
        return false;
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
        
        // Panel shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.panelX + 6, this.panelY + 6, this.panelWidth, this.panelHeight);
        
        // Panel background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(this.panelX, this.panelY, this.panelWidth, this.panelHeight);
        
        // Panel border
        ctx.strokeStyle = '#483D8B';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.panelX, this.panelY, this.panelWidth, this.panelHeight);
        
        // Title
        ctx.fillStyle = '#fff';
        ctx.font = '20px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('CUSTOM', CONFIG.CANVAS_WIDTH / 2, this.panelY + 55);
        
        // Selection rows
        const rowY = this.panelY + 110; // Match setupButtons
        const rowSpacing = 80; // Match setupButtons
        
        // Map selection
        this.renderSelectionRow(ctx, 'MAP', this.maps[this.selectedMapIndex].name, rowY);
        
        // Ability selection (below map, above monster)
        const abilityInfo = getAbilityInfo(this.abilityTypes[this.selectedAbilityIndex]);
        const abilityLabel = abilityInfo.name;
        this.renderSelectionRow(ctx, 'ABILITY', abilityLabel, rowY + rowSpacing, abilityInfo.color);
        
        // Ability description
        ctx.fillStyle = '#666';
        ctx.font = '8px "Press Start 2P", cursive';
        ctx.fillText(abilityInfo.description, CONFIG.CANVAS_WIDTH / 2, rowY + rowSpacing + 30);
        
        // Monster selection
        const monsterInfo = getMonsterInfo(this.monsterTypes[this.selectedMonsterIndex]);
        const monsterLabel = monsterInfo.name;
        this.renderSelectionRow(ctx, 'MONSTER', monsterLabel, rowY + rowSpacing * 2, monsterInfo.color);
        
        // Monster description
        ctx.fillStyle = '#666';
        ctx.font = '8px "Press Start 2P", cursive';
        ctx.fillText(monsterInfo.description, CONFIG.CANVAS_WIDTH / 2, rowY + rowSpacing * 2 + 30);
        
        // Generator count
        this.renderSelectionRow(ctx, 'GENERATORS', this.generatorCount.toString(), rowY + rowSpacing * 3);
        
        // Render buttons
        for (const btn of this.buttons) {
            this.renderButton(ctx, btn);
        }
        
        ctx.textAlign = 'left';
    }
    
    renderSelectionRow(ctx, label, value, y, valueColor = null) {
        // Label
        ctx.fillStyle = '#888';
        ctx.font = '10px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText(label, CONFIG.CANVAS_WIDTH / 2, y - 15);
        
        // Value (with optional custom color)
        ctx.fillStyle = valueColor || '#fff';
        ctx.font = '14px "Press Start 2P", cursive';
        ctx.fillText(value, CONFIG.CANVAS_WIDTH / 2, y + 10);
    }
    
    renderButton(ctx, btn) {
        const isHovered = this.hoveredButton === btn.id;
        const isSmall = btn.width <= 50;
        
        // Button shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(btn.x + 3, btn.y + 3, btn.width, btn.height);
        
        // Button background
        if (btn.id === 'start') {
            ctx.fillStyle = isHovered ? '#2e7d32' : '#1b5e20';
        } else if (btn.id === 'back') {
            // Match SettingsUI back button style
            ctx.fillStyle = isHovered ? '#483D8B' : '#2a2a4a';
        } else {
            ctx.fillStyle = isHovered ? '#483D8B' : '#2a2a4a';
        }
        ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
        
        // Button border
        if (btn.id === 'start') {
            ctx.strokeStyle = isHovered ? '#4caf50' : '#2e7d32';
        } else if (btn.id === 'back') {
            // Match SettingsUI back button style
            ctx.strokeStyle = isHovered ? '#7B68EE' : '#483D8B';
        } else {
            ctx.strokeStyle = isHovered ? '#7B68EE' : '#483D8B';
        }
        ctx.lineWidth = 3;
        ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
        
        // Button text
        ctx.fillStyle = isHovered ? '#fff' : '#aaa';
        
        // Special color for back button text to match SettingsUI
        if (btn.id === 'back') {
             ctx.fillStyle = '#fff';
        }

        ctx.font = isSmall ? '16px "Press Start 2P", cursive' : '12px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + (isSmall ? 6 : 5));
    }
}
