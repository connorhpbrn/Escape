import { CONFIG } from '../main.js';
import { GameMap } from '../world/Map.js';
import { Player } from '../entities/Player.js';
import { Generator } from '../entities/Generator.js';
import { Exit } from '../entities/Exit.js';
import { Door } from '../entities/Door.js';
import { Decoy } from '../entities/Decoy.js';
import { Cabinet } from '../entities/Cabinet.js';
import { HUD } from '../ui/HUD.js';
import { distance } from '../world/Collision.js';
import { 
    selectRandomMonsterType, 
    createCurrentMonster, 
    getCurrentMonsterInfo,
    resetMonsterSelection,
    forceMonsterType,
    createMonster,
    getMonsterInfo,
    getMonsterTypes
} from '../entities/monsters/MonsterFactory.js';
import {
    selectRandomAbilityType,
    getCurrentAbilityType,
    resetAbilitySelection,
    forceAbilityType
} from '../entities/AbilityFactory.js';
import { AIPlayer } from '../entities/AIPlayer.js';
import { PlayerKraken } from '../entities/PlayerKraken.js';

export class GameState {
    constructor(game) {
        this.game = game;
        this.map = null;
        this.player = null;
        this.monster = null;
        this.monsters = []; // Array for Fracture monster support
        this.generators = [];
        this.exit = null;
        this.doors = [];
        this.decoys = [];
        this.cabinets = [];
        this.hud = null;
        
        this.debugMode = false;
        this.heartbeatTimer = 0;
        this.heartbeatInterval = 0.8;
        
        this.activeGenerator = null;
        this.monsterInfo = null; // Current monster type info
    }
    
    enter(data = {}) {
        this.customSettings = data.customSettings || null;
        this.extraMode = data.extraMode || null;
        this.endlessLevel = data.endlessLevel || 1;
        this.initGame();
        this.game.audioManager.startMusic();
    }
    
    exit() {
        // Don't stop music so it continues to End/Pause/Menu
    }
    
    initGame() {
        // Check for custom settings and extra modes
        const isCustomGame = this.customSettings !== null;
        const isMirrorMode = this.extraMode === 'mirror';
        const isNightmareMode = this.extraMode === 'nightmare';
        const isReverseMode = this.extraMode === 'reverse';
        
        // Create map (custom or random)
        if (isCustomGame && this.customSettings.mapConfig) {
            this.map = new GameMap(this.customSettings.mapConfig, isMirrorMode);
        } else {
            this.map = new GameMap(null, isMirrorMode);
        }
        const mapConfig = this.map.mapConfig;
        
        // Select monster type (custom or random, or all for nightmare)
        resetMonsterSelection();
        if (isNightmareMode) {
            // Nightmare mode uses all monsters - we'll handle this below
            this.monsterInfo = { name: 'All Monsters', description: 'Nightmare Mode' };
        } else if (isCustomGame && this.customSettings.monsterType) {
            forceMonsterType(this.customSettings.monsterType);
            this.monsterInfo = getMonsterInfo(this.customSettings.monsterType);
        } else {
            selectRandomMonsterType();
            this.monsterInfo = getCurrentMonsterInfo();
        }
        
        // Determine generator count (custom or default)
        const generatorCount = isCustomGame && this.customSettings.generatorCount 
            ? this.customSettings.generatorCount 
            : CONFIG.GENERATOR_COUNT;
        
        // Create generators (pick from spawn points)
        this.generators = [];
        const shuffledSpawns = [...mapConfig.generatorSpawns].sort(() => Math.random() - 0.5);
        const actualGenCount = Math.min(generatorCount, shuffledSpawns.length);
        for (let i = 0; i < actualGenCount; i++) {
            const spawn = shuffledSpawns[i];
            const pos = this.map.tileToWorld(spawn.x, spawn.y);
            this.generators.push(new Generator(pos.x, pos.y, i));
        }
        
        // Store the required generator count for win condition
        this.requiredGenerators = actualGenCount;
        
        // Create exit (will spawn randomly when generators are done)
        this.exit = new Exit(0, 0);
        
        // Create doors from map config
        this.doors = [];
        for (const doorData of mapConfig.doors) {
            // Mirror mode: flip door X positions
            const doorX = isMirrorMode ? (this.map.width - 1 - doorData.x - 1) : doorData.x;
            this.doors.push(new Door(doorX, doorData.y, doorData.orientation));
        }
        
        // Create cabinets from map config (disabled for Reverse Mode)
        this.cabinets = [];
        if (mapConfig.cabinets && !isReverseMode) {
            for (const cabinetData of mapConfig.cabinets) {
                // Mirror mode: flip cabinet X positions
                const cabX = isMirrorMode ? (this.map.width - 1 - cabinetData.x) : cabinetData.x;
                this.cabinets.push(new Cabinet(cabX, cabinetData.y));
            }
        }
        
        // Get occupied positions (generators, exit, doors)
        const occupiedPositions = [];
        for (const gen of this.generators) {
            occupiedPositions.push({ x: gen.x, y: gen.y });
        }
        occupiedPositions.push({ x: this.exit.x, y: this.exit.y });
        for (const door of this.doors) {
            occupiedPositions.push({ x: door.x, y: door.y });
        }
        
        // Reverse mode: player controls Kraken, AI controls player
        if (isReverseMode) {
            // Spawn AI player
            const aiSpawn = this.findRandomSpawnPoint(occupiedPositions, 100);
            this.aiPlayer = new AIPlayer(aiSpawn.x, aiSpawn.y, this.map);
            occupiedPositions.push(aiSpawn);
            
            // Spawn player-controlled Kraken
            const krakenSpawn = this.findRandomSpawnPoint(occupiedPositions, 300, aiSpawn);
            this.playerKraken = new PlayerKraken(krakenSpawn.x, krakenSpawn.y, this.map);
            
            // Set references for AI
            this.aiPlayer.setReferences(this.generators, this.exit, this.playerKraken);
            
            // No normal player/monsters in reverse mode
            this.player = null;
            this.monsters = [];
            this.monster = null;
        } else {
            // Normal mode setup
            this.aiPlayer = null;
            this.playerKraken = null;
            
            // Find random spawn for player
            const playerSpawn = this.findRandomSpawnPoint(occupiedPositions, 100);
            this.player = new Player(playerSpawn.x, playerSpawn.y);
            this.player.mirrorControls = isMirrorMode; // Set mirror controls flag
            occupiedPositions.push(playerSpawn);
            
            // Select ability (custom or random)
            resetAbilitySelection();
            if (isCustomGame && this.customSettings.abilityType) {
                forceAbilityType(this.customSettings.abilityType);
            } else {
                selectRandomAbilityType();
            }
            this.player.setAbility(getCurrentAbilityType());
            
            // Initialize monsters array
            this.monsters = [];
            
            if (isNightmareMode) {
                // Nightmare mode: spawn ALL monster types
                const monsterTypes = getMonsterTypes();
                for (const typeKey of monsterTypes) {
                    const monsterSpawn = this.findRandomSpawnPoint(occupiedPositions, 200, playerSpawn);
                    const monster = createMonster(typeKey, monsterSpawn.x, monsterSpawn.y, this.map, this.game);
                    
                    if (monster._fractureArray) {
                        // Fracture monster - add all instances
                        this.monsters.push(...monster._fractureArray);
                    } else {
                        this.monsters.push(monster);
                    }
                    occupiedPositions.push(monsterSpawn);
                }
                this.monster = this.monsters[0]; // Primary monster reference
            } else {
                // Normal mode: single monster type
                const monsterSpawn = this.findRandomSpawnPoint(occupiedPositions, 300, playerSpawn);
                this.monster = createCurrentMonster(monsterSpawn.x, monsterSpawn.y, this.map, this.game);
                
                if (this.monster._fractureArray) {
                    // Fracture monster - use its internal array
                    this.monsters = this.monster._fractureArray;
                } else {
                    this.monsters = [this.monster];
                }
            }
            
            // Set exit position for Sentinel(s)
            for (const monster of this.monsters) {
                if (monster.setExitPosition) {
                    monster.setExitPosition(this.exit.x, this.exit.y);
                }
            }
        }
        
        // Reset decoys
        this.decoys = [];
        
        // Create HUD
        this.hud = new HUD();
        
        // Reset state
        this.debugMode = false;
        this.heartbeatTimer = 0;
        this.activeGenerator = null;
    }
    
    update(deltaTime) {
        // Handle pause
        if (this.game.isKeyJustPressed('Escape')) {
            this.game.changeState('pause', { previousState: 'game' });
            return;
        }
        
        // Toggle debug mode
        if (this.game.isKeyJustPressed('F3')) {
            this.debugMode = !this.debugMode;
        }
        
        // Reverse mode: different update logic
        if (this.extraMode === 'reverse') {
            this.updateReverseMode(deltaTime);
            return;
        }
        
        // Update player
        this.player.update(deltaTime, this.game.keys, this.map, this.doors, this.game);
        
        // Track player footsteps for Echo monster
        const isMoving = Math.abs(this.player.vx) > 0.1 || Math.abs(this.player.vy) > 0.1;
        if (isMoving) {
            this.footstepTimer = (this.footstepTimer || 0) + deltaTime;
            const footstepInterval = this.player.isSprinting ? 0.15 : 0.3;
            if (this.footstepTimer >= footstepInterval) {
                this.footstepTimer = 0;
                // Get loudness multiplier (increased when surging)
                const loudness = this.player.getFootstepLoudness();
                for (const monster of this.monsters) {
                    if (monster.onPlayerFootstep) {
                        // Pass loudness to Echo monster
                        monster.onPlayerFootstep(this.player.x, this.player.y, this.player.isSurging || this.player.isSprinting, loudness);
                    }
                }
            }
        }
        
        // Handle ability usage (Q key)
        if (this.game.isKeyJustPressed('KeyQ')) {
            this.player.useAbility(this.map, this.game);
        }
        
        // Update decoys (kept for backwards compatibility)
        this.decoys = this.decoys.filter(d => {
            d.update(deltaTime);
            return d.active || d.particles.length > 0;
        });
        
        // Update all monsters
        for (const monster of this.monsters) {
            monster.update(deltaTime, this.player, this.doors, this.decoys);
        }
        
        // Remove despawned Sentinels
        if (this.monster.isDespawned && this.monster.isDespawned()) {
            this.monsters = this.monsters.filter(m => !m.isDespawned || !m.isDespawned());
        }
        
        // Update generators
        this.hud.clearInteractionPrompt();
        
        for (const gen of this.generators) {
            gen.update(deltaTime);
            
            if (gen.isActive) {
                continue;
            }
            
            // Check interaction
            if (gen.isPlayerInRange(this.player)) {
                if (this.game.isKeyPressed('KeyE')) {
                    gen.startActivation();
                    this.activeGenerator = gen;
                    
                    // Notify Echo monsters of generator activation sound
                    for (const monster of this.monsters) {
                        if (monster.onGeneratorActivating) {
                            monster.onGeneratorActivating(gen.x, gen.y);
                        }
                    }
                    
                    // Start smooth charging sound if not already playing
                    this.game.audioManager.startGeneratorCharge();
                    this.game.audioManager.updateGeneratorChargePitch(gen.activationProgress);
                    
                    if (gen.updateActivation(deltaTime)) {
                        // Generator activated!
                        this.game.audioManager.stopGeneratorCharge();
                        this.game.audioManager.playGeneratorComplete();
                        this.hud.addMinimapPing(gen.x, gen.y);
                        
                        // Count active generators after this one
                        const newActiveCount = this.generators.filter(g => g.isActive).length;
                        
                        // Notify all monsters
                        for (const monster of this.monsters) {
                            monster.onNoiseEvent(gen.x, gen.y);
                            monster.setGeneratorsActivated(newActiveCount);
                            
                            // Special: Fracture may split on generator activation
                            if (monster.onGeneratorActivated) {
                                monster.onGeneratorActivated();
                            }
                        }
                        
                        // Check if all generators active
                        if (newActiveCount >= this.requiredGenerators) {
                            // Spawn exit at random edge location
                            const exitPos = this.findRandomEdgeSpawnPoint();
                            this.exit.spawnAt(exitPos.x, exitPos.y);
                            this.game.audioManager.playExitOpen();
                            
                            // Notify monsters of exit opening
                            for (const monster of this.monsters) {
                                if (monster.onExitOpen) {
                                    monster.onExitOpen(this.exit.x, this.exit.y);
                                }
                                // Sentinel: switch to guarding mode
                                if (monster.onExitUnlocked) {
                                    monster.onExitUnlocked();
                                }
                                // Update Sentinel's exit position
                                if (monster.setExitPosition) {
                                    monster.setExitPosition(this.exit.x, this.exit.y);
                                }
                            }
                        }
                    }
                    
                    this.hud.setInteractionPrompt('Activating...');
                } else {
                    gen.cancelActivation();
                    this.game.audioManager.stopGeneratorCharge();
                    this.hud.setInteractionPrompt('Press E to activate');
                }
            } else {
                gen.cancelActivation();
                this.game.audioManager.stopGeneratorCharge();
            }
        }
        
        // Update doors
        for (const door of this.doors) {
            door.update(deltaTime);
            
            if (door.isPlayerInRange(this.player) && door.canClose()) {
                if (!this.hud.interactionPrompt) {
                    this.hud.setInteractionPrompt('Press E to close door');
                }
                
                if (this.game.isKeyJustPressed('KeyE')) {
                    if (door.close()) {
                        this.game.audioManager.playDoorClose();
                        
                        // Notify Resonant monsters of door sound
                        for (const monster of this.monsters) {
                            if (monster.onDoorClose) {
                                monster.onDoorClose(door.x, door.y);
                            }
                        }
                    }
                }
            }
        }
        
        // Update cabinets - handle hiding
        for (const cabinet of this.cabinets) {
            cabinet.update(deltaTime);
            
            if (this.player.isHiding && this.player.hiddenInCabinet === cabinet) {
                // Player is hiding in this cabinet - check for exit
                if (this.game.isKeyJustPressed('KeyE')) {
                    cabinet.releasePlayer(this.player);
                }
                this.hud.setInteractionPrompt('Press E to exit cabinet');
            } else if (!this.player.isHiding && cabinet.canHide(this.player)) {
                if (!this.hud.interactionPrompt) {
                    this.hud.setInteractionPrompt('Press E to hide');
                }
                
                if (this.game.isKeyJustPressed('KeyE')) {
                    if (cabinet.hidePlayer(this.player)) {
                        this.game.audioManager.playCabinetEnter();
                    }
                }
            }
        }
        
        // Update exit
        this.exit.update(deltaTime);
        
        if (this.exit.isSpawned && this.exit.isPlayerInRange(this.player)) {
            this.hud.setInteractionPrompt('Press E to ESCAPE!');
            
            if (this.game.isKeyJustPressed('KeyE')) {
                // Win!
                this.game.audioManager.playWin();
                
                // Endless mode: continue to next map
                if (this.extraMode === 'endless') {
                    this.game.changeState('game', { 
                        extraMode: 'endless', 
                        endlessLevel: this.endlessLevel + 1 
                    });
                    return;
                }
                
                this.game.changeState('end', { 
                    won: true, 
                    customSettings: this.customSettings,
                    extraMode: this.extraMode
                });
                return;
            }
        }
        
        // Update HUD
        this.hud.update(deltaTime);
        
        // Check monster collision with player (all monsters)
        // Player is safe when hiding in cabinet
        let closestMonsterDist = Infinity;
        for (const monster of this.monsters) {
            const distToMonster = distance(this.player.x, this.player.y, monster.x, monster.y);
            closestMonsterDist = Math.min(closestMonsterDist, distToMonster);
            
            // Check if this monster can kill and is close enough (not when hiding)
            const canKill = monster.canKillPlayer ? monster.canKillPlayer() : true;
            if (!this.player.isHiding && canKill && distToMonster < (this.player.size + monster.size) / 2) {
                // Lose!
                this.game.audioManager.playMonsterHit();
                this.game.audioManager.playLose();
                this.game.triggerScreenShake(15, 0.5);
                this.game.changeState('end', { 
                    won: false, 
                    customSettings: this.customSettings,
                    extraMode: this.extraMode,
                    endlessLevel: this.endlessLevel,
                    monsterName: monster.name 
                });
                return;
            }
        }
        
        // Heartbeat when any monster is close
        if (closestMonsterDist < CONFIG.PANIC_DISTANCE) {
            this.heartbeatTimer -= deltaTime;
            if (this.heartbeatTimer <= 0) {
                this.game.audioManager.playHeartbeat();
                // Faster heartbeat when closer
                const intensity = 1 - (closestMonsterDist / CONFIG.PANIC_DISTANCE);
                this.heartbeatTimer = this.heartbeatInterval * (1 - intensity * 0.5);
                
                // Small screen shake
                this.game.triggerScreenShake(2 + intensity * 3, 0.1);
            }
        }
    }
    
    // Reverse mode update - player controls Kraken, AI controls player
    updateReverseMode(deltaTime) {
        // Check if Kraken is being forced to a decoy
        const activeDecoy = this.aiPlayer.activeDecoy;
        if (activeDecoy) {
            // Force Kraken to move towards decoy - player has no control
            const dx = activeDecoy.x - this.playerKraken.x;
            const dy = activeDecoy.y - this.playerKraken.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 10) {
                const speed = this.playerKraken.speed * 1.2 * deltaTime;
                this.playerKraken.x += (dx / dist) * speed;
                this.playerKraken.y += (dy / dist) * speed;
            }
            
            // Update Kraken animation only
            this.playerKraken.tentaclePhase += deltaTime * 3;
            this.playerKraken.pulseOffset = Math.sin(this.playerKraken.tentaclePhase) * 2;
        } else {
            // Normal Kraken control
            this.playerKraken.update(deltaTime, this.game.keys, this.aiPlayer);
        }
        
        // Update AI player
        this.aiPlayer.update(deltaTime);
        
        // Track AI footsteps
        this.reverseFootstepTimer = (this.reverseFootstepTimer || 0) + deltaTime;
        if (this.reverseFootstepTimer >= 0.2) {
            this.reverseFootstepTimer = 0;
            this.playerKraken.addFootstep(this.aiPlayer.x, this.aiPlayer.y);
        }
        
        // Update generators
        for (const gen of this.generators) {
            gen.update(deltaTime);
        }
        
        // Update exit
        this.exit.update(deltaTime);
        
        // Check if all generators are active - spawn exit
        const activeCount = this.generators.filter(g => g.isActive).length;
        if (activeCount >= this.requiredGenerators && !this.exit.isSpawned) {
            const exitPos = this.findRandomEdgeSpawnPoint();
            this.exit.spawnAt(exitPos.x, exitPos.y);
            this.game.audioManager.playExitOpen();
            this.aiPlayer.setReferences(this.generators, this.exit, this.playerKraken);
        }
        
        // Check win/lose conditions
        const distToAI = distance(this.playerKraken.x, this.playerKraken.y, this.aiPlayer.x, this.aiPlayer.y);
        if (distToAI < (this.playerKraken.size + this.aiPlayer.size) / 2) {
            this.game.audioManager.playMonsterHit();
            this.game.audioManager.playWin();
            this.game.changeState('end', { 
                won: true, 
                extraMode: 'reverse',
                reverseWin: true
            });
            return;
        }
        
        if (this.aiPlayer.reachedExit) {
            this.game.audioManager.playLose();
            this.game.changeState('end', { 
                won: false, 
                extraMode: 'reverse',
                monsterName: 'The survivor'
            });
            return;
        }
        
        // Update HUD (no interaction prompt)
        this.hud.update(deltaTime);
    }
    
    render(ctx) {
        // Reverse mode: different render logic
        if (this.extraMode === 'reverse') {
            this.renderReverseMode(ctx);
            return;
        }
        
        const flashlightRadius = 200;
        const isPulsing = this.player.isPulsing;
        
        // Render map (walls always visible but dimmed outside flashlight)
        this.map.render(ctx);
        
        // Render barricades
        this.renderBarricades(ctx);
        
        // Render doors (visible during pulse or in flashlight range)
        for (const door of this.doors) {
            if (isPulsing || this.isInFlashlightRange(door.x, door.y, flashlightRadius)) {
                door.render(ctx);
            }
        }
        
        // Render cabinets (visible during pulse or in flashlight range)
        for (const cabinet of this.cabinets) {
            if (isPulsing || this.isInFlashlightRange(cabinet.x, cabinet.y, flashlightRadius)) {
                cabinet.render(ctx);
            }
        }
        
        // Render generators (visible during pulse or in flashlight range)
        for (const gen of this.generators) {
            if (isPulsing || this.isInFlashlightRange(gen.x, gen.y, flashlightRadius)) {
                gen.render(ctx, true);
            }
        }
        
        // Render exit (visible during pulse or in flashlight range)
        if (isPulsing || this.isInFlashlightRange(this.exit.x, this.exit.y, flashlightRadius)) {
            this.exit.render(ctx);
        }
        
        // Render decoys (visible during pulse or in flashlight range)
        for (const decoy of this.decoys) {
            if (isPulsing || this.isInFlashlightRange(decoy.x, decoy.y, flashlightRadius)) {
                decoy.render(ctx);
            }
        }
        
        // Render all monsters (visible during pulse or in flashlight range)
        for (const monster of this.monsters) {
            if (isPulsing || this.isInFlashlightRange(monster.x, monster.y, flashlightRadius)) {
                monster.render(ctx);
            }
        }
        
        // Render player
        this.player.render(ctx);
        
        // Apply flashlight darkness effect (fade in/out based on pulse)
        const pulseAlpha = this.player.isPulsing ? this.player.pulseFlashAlpha : 0;
        const darknessIntensity = 1.0 - pulseAlpha;
        
        this.renderFlashlight(ctx, darknessIntensity);
        
        if (this.player.isPulsing) {
            // Pulse effect - slight golden tint overlay that fades
            this.renderPulseEffect(ctx);
        }
        
        // Vignette
        this.renderVignette(ctx);
        
        // Render HUD
        this.hud.render(ctx, {
            generators: this.generators,
            player: this.player,
            monster: this.monster,
            exit: this.exit,
            doors: this.doors,
            map: this.map,
        });
        
        // Debug overlay
        if (this.debugMode) {
            this.renderDebug(ctx);
        }
    }
    
    renderPulseEffect(ctx) {
        // Golden flash effect during pulse
        const alpha = this.player.pulseFlashAlpha * 0.3;
        ctx.fillStyle = `rgba(255, 217, 61, ${alpha})`;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }
    
    // Reverse mode render - flashlight centered on Kraken
    renderReverseMode(ctx) {
        const flashlightRadius = 200;
        
        // Render map
        this.map.render(ctx);
        
        // Render AI barricades (always visible)
        this.aiPlayer.renderBarricades(ctx);
        
        // Render doors (only in flashlight range)
        for (const door of this.doors) {
            if (this.isInReverseFlashlightRange(door.x, door.y, flashlightRadius)) {
                door.render(ctx);
            }
        }
        
        // Render cabinets (only in flashlight range)
        for (const cabinet of this.cabinets) {
            if (this.isInReverseFlashlightRange(cabinet.x, cabinet.y, flashlightRadius)) {
                cabinet.render(ctx);
            }
        }
        
        // Render generators (only in flashlight range)
        for (const gen of this.generators) {
            if (this.isInReverseFlashlightRange(gen.x, gen.y, flashlightRadius)) {
                gen.render(ctx, true);
            }
        }
        
        // Render exit (only in flashlight range)
        if (this.isInReverseFlashlightRange(this.exit.x, this.exit.y, flashlightRadius)) {
            this.exit.render(ctx);
        }
        
        // Render AI decoy (always visible - it's a lure!)
        this.aiPlayer.renderDecoy(ctx);
        
        // Render footsteps (red trail of AI player - always visible)
        this.playerKraken.renderFootsteps(ctx);
        
        // Render AI player (only in flashlight range)
        if (this.isInReverseFlashlightRange(this.aiPlayer.x, this.aiPlayer.y, flashlightRadius)) {
            this.aiPlayer.render(ctx);
        }
        
        // Render player-controlled Kraken
        this.playerKraken.render(ctx);
        
        // Apply flashlight darkness effect centered on Kraken
        this.renderReverseFlashlight(ctx, flashlightRadius);
        
        // Vignette
        this.renderVignette(ctx);
        
        // Render HUD (minimal - just generators and decoy warning)
        this.renderReverseHUD(ctx);
        
        // Debug overlay
        if (this.debugMode) {
            this.renderDebug(ctx);
        }
    }
    
    isInReverseFlashlightRange(x, y, radius) {
        const dx = x - this.playerKraken.x;
        const dy = y - this.playerKraken.y;
        return Math.sqrt(dx * dx + dy * dy) <= radius + 50;
    }
    
    renderReverseFlashlight(ctx, radius) {
        const px = this.playerKraken.x;
        const py = this.playerKraken.y;
        
        // Create darkness gradient centered on Kraken
        const gradient = ctx.createRadialGradient(px, py, radius * 0.3, px, py, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }
    
    renderReverseHUD(ctx) {
        const activeCount = this.generators.filter(g => g.isActive).length;
        
        // Generator counter in top-left
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 180, 40);
        
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 180, 40);
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Press Start 2P", cursive';
        ctx.textAlign = 'left';
        ctx.fillText(`Generators`, 20, 28);
        ctx.fillText(`${activeCount}/${this.requiredGenerators}`, 20, 44);
        
        // Decoy warning when being forced
        if (this.aiPlayer.activeDecoy) {
            const warningY = CONFIG.CANVAS_HEIGHT / 2 - 50;
            
            // Pulsing background
            const pulse = Math.sin(Date.now() / 100) * 0.2 + 0.6;
            ctx.fillStyle = `rgba(255, 100, 0, ${pulse * 0.3})`;
            ctx.fillRect(CONFIG.CANVAS_WIDTH / 2 - 150, warningY, 300, 50);
            
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 3;
            ctx.strokeRect(CONFIG.CANVAS_WIDTH / 2 - 150, warningY, 300, 50);
            
            ctx.fillStyle = '#ff9500';
            ctx.font = '14px "Press Start 2P", cursive';
            ctx.textAlign = 'center';
            ctx.fillText('LURED BY DECOY!', CONFIG.CANVAS_WIDTH / 2, warningY + 32);
        }
    }

    renderBarricades(ctx) {
        const ts = CONFIG.TILE_SIZE;
        const theme = this.map.theme;
        
        if (this.player.barricades.length === 0) return;

        let totalX = 0;
        let totalY = 0;
        const count = this.player.barricades.length;

        for (const barricade of this.player.barricades) {
            const x = barricade.tileX * ts;
            const y = barricade.tileY * ts;
            
            // Draw barricade using map's wall color
            ctx.fillStyle = theme.wallColor || '#3a3a4a';
            ctx.fillRect(x, y, ts, ts);
            
            // Border
            ctx.strokeStyle = theme.wallBorderColor || '#2a2a3a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, ts, ts);
            
            // Accumulate center positions for unified ring
            totalX += x + ts / 2;
            totalY += y + ts / 2;
        }

        // Draw single shared cooldown ring at the center of all barricades
        const centerX = totalX / count;
        const centerY = totalY / count;
        
        // Use timer of the first barricade (they expire together)
        const duration = 5.0; // Hardcoded matches AbilityFactory
        const progress = this.player.barricades[0].timer / duration;
        
        // Green ring, radius 20 to match door
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Counter-clockwise unwinding like door
        ctx.arc(centerX, centerY, 20, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
    }
    
    isInFlashlightRange(x, y, radius) {
        const dx = x - this.player.x;
        const dy = y - this.player.y;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
    }
    
    findRandomSpawnPoint(occupiedPositions, minDistFromOccupied, mustBeAwayFrom = null) {
        const minDistFromPlayer = mustBeAwayFrom ? 300 : 0;
        
        for (let attempts = 0; attempts < 200; attempts++) {
            // Pick a random tile
            const tx = Math.floor(Math.random() * this.map.width);
            const ty = Math.floor(Math.random() * this.map.height);
            
            // Check if walkable
            if (!this.map.isWalkable(tx, ty)) continue;
            
            const pos = this.map.tileToWorld(tx, ty);
            
            // Check distance from occupied positions
            let tooClose = false;
            for (const occ of occupiedPositions) {
                const dist = distance(pos.x, pos.y, occ.x, occ.y);
                if (dist < minDistFromOccupied) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;
            
            // Check distance from mustBeAwayFrom (for monster spawn)
            if (mustBeAwayFrom) {
                const distFromPlayer = distance(pos.x, pos.y, mustBeAwayFrom.x, mustBeAwayFrom.y);
                if (distFromPlayer < minDistFromPlayer) continue;
            }
            
            return pos;
        }
        
        // Fallback: just find any walkable tile
        for (let ty = 1; ty < this.map.height - 1; ty++) {
            for (let tx = 1; tx < this.map.width - 1; tx++) {
                if (this.map.isWalkable(tx, ty)) {
                    return this.map.tileToWorld(tx, ty);
                }
            }
        }
        
        // Ultimate fallback
        return { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
    }
    
    // Find a random walkable tile on the edge of the map (for exit spawn)
    findRandomEdgeSpawnPoint() {
        const edgeTiles = [];
        
        // Collect all walkable tiles on the edges (within 2 tiles of border)
        for (let ty = 0; ty < this.map.height; ty++) {
            for (let tx = 0; tx < this.map.width; tx++) {
                // Check if this is an edge tile (within 2 tiles of any border)
                const isEdge = tx <= 2 || tx >= this.map.width - 3 || 
                               ty <= 2 || ty >= this.map.height - 3;
                
                if (isEdge && this.map.isWalkable(tx, ty)) {
                    edgeTiles.push({ tx, ty });
                }
            }
        }
        
        // Shuffle and find one that's not too close to player/AI
        const shuffled = edgeTiles.sort(() => Math.random() - 0.5);
        
        // Get reference position (player in normal mode, AI player in reverse mode)
        const refEntity = this.player || this.aiPlayer;
        
        for (const tile of shuffled) {
            const pos = this.map.tileToWorld(tile.tx, tile.ty);
            const distFromRef = refEntity ? distance(pos.x, pos.y, refEntity.x, refEntity.y) : 999;
            
            // Prefer tiles at least 200 pixels from player/AI
            if (distFromRef >= 200) {
                return pos;
            }
        }
        
        // Fallback: just pick any edge tile
        if (shuffled.length > 0) {
            const tile = shuffled[0];
            return this.map.tileToWorld(tile.tx, tile.ty);
        }
        
        // Ultimate fallback: center of map
        return this.map.tileToWorld(Math.floor(this.map.width / 2), Math.floor(this.map.height / 2));
    }
    
    renderFlashlight(ctx, intensity = 1.0) {
        if (intensity <= 0) return;

        // Create darkness with flashlight cone
        const flashlightCanvas = document.createElement('canvas');
        flashlightCanvas.width = CONFIG.CANVAS_WIDTH;
        flashlightCanvas.height = CONFIG.CANVAS_HEIGHT;
        const fCtx = flashlightCanvas.getContext('2d');
        
        // Fill with darkness
        fCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        fCtx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Cut out flashlight cone
        fCtx.globalCompositeOperation = 'destination-out';
        
        const gradient = fCtx.createRadialGradient(
            this.player.x, this.player.y, 0,
            this.player.x, this.player.y, 200
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        fCtx.fillStyle = gradient;
        fCtx.beginPath();
        fCtx.arc(this.player.x, this.player.y, 200, 0, Math.PI * 2);
        fCtx.fill();
        
        // Draw the darkness layer with variable intensity
        ctx.save();
        ctx.globalAlpha = intensity;
        ctx.drawImage(flashlightCanvas, 0, 0);
        ctx.restore();
    }
    
    renderVignette(ctx) {
        const gradient = ctx.createRadialGradient(
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, CONFIG.CANVAS_HEIGHT * 0.4,
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, CONFIG.CANVAS_HEIGHT * 0.9
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${CONFIG.VIGNETTE_INTENSITY})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }
    
    renderDebug(ctx) {
        // Debug overlay background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, CONFIG.CANVAS_HEIGHT - 140, 320, 130);
        
        ctx.fillStyle = '#0f0';
        ctx.font = '12px monospace';
        
        // Monster type info
        const monsterName = this.monsterInfo ? this.monsterInfo.name : 'Unknown';
        const monsterDifficulty = this.monsterInfo ? this.monsterInfo.difficulty : '?';
        
        const lines = [
            `Monster: ${monsterName} (${monsterDifficulty})`,
            `Player: (${this.player.x.toFixed(0)}, ${this.player.y.toFixed(0)})`,
            `Monster Count: ${this.monsters.length}`,
            `Primary: (${this.monster.x.toFixed(0)}, ${this.monster.y.toFixed(0)}) State: ${this.monster.state}`,
            `Monster Speed: ${this.monster.getCurrentSpeed ? this.monster.getCurrentSpeed().toFixed(1) : this.monster.speed.toFixed(1)}`,
            `Generators: ${this.generators.filter(g => g.isActive).length}/${this.requiredGenerators}`,
            `Exit Unlocked: ${this.exit.isUnlocked}`,
        ];
        
        lines.forEach((line, i) => {
            ctx.fillText(line, 20, CONFIG.CANVAS_HEIGHT - 120 + i * 16);
        });
        
        // Render debug info for all monsters
        for (const monster of this.monsters) {
            monster.renderDebug(ctx, this.player);
        }
        
        // Draw generator states
        for (const gen of this.generators) {
            ctx.fillStyle = gen.isActive ? '#0f0' : '#ff0';
            ctx.font = '10px monospace';
            ctx.fillText(gen.isActive ? 'ON' : 'OFF', gen.x - 10, gen.y - 25);
        }
    }
}
