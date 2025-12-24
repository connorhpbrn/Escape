import { Gazer } from './Gazer.js';
import { Phantom } from './Phantom.js';
import { Echo } from './Echo.js';
import { Mimic } from './Mimic.js';
import { Fracture } from './Fracture.js';
import { Sentinel } from './Sentinel.js';
import { Kraken } from './Kraken.js';

// ============================================
// MONSTER FACTORY
// Handles monster type registration and random selection
// ============================================

// Monster registry - add new monsters here
// Order determines appearance in Custom Game UI (Easy -> Hard)
const MONSTER_TYPES = {
    KRAKEN: {
        class: Kraken,
        name: 'Kraken',
        description: 'The original threat',
        difficulty: 'Easy',
        weight: 1.0,
        color: '#c0392b'
    },
    GAZER: {
        class: Gazer,
        name: 'Gazer',
        description: 'Freezes when watched',
        difficulty: 'Medium',
        weight: 1.0,
        color: '#7000c0ff'
    },
    PHANTOM: {
        class: Phantom,
        name: 'Phantom',
        description: 'Invisible until it sees you',
        difficulty: 'Medium',
        weight: 1.0,
        color: '#9370DB'
    },
    MIMIC: {
        class: Mimic,
        name: 'Mimic',
        description: 'Copies your movement',
        difficulty: 'Medium',
        weight: 1.0,
        color: '#b3b300'
    },
    ECHO: {
        class: Echo,
        name: 'Echo',
        description: 'Hunts by sound',
        difficulty: 'Hard',
        weight: 0.9,
        color: '#e65c00'
    },
    FRACTURE: {
        class: Fracture,
        name: 'Fracture',
        description: 'Splits when threatened',
        difficulty: 'Hard',
        weight: 0.8,
        color: '#6495ED'
    },
    SENTINEL: {
        class: Sentinel,
        name: 'Sentinel',
        description: 'Smashes doors, guards the exit',
        difficulty: 'Very Hard',
        weight: 0.5,
        color: '#E0E0E0'
    }
};

// Current selected monster type (set at game start)
let currentMonsterType = null;

/**
 * Get all available monster types
 */
export function getMonsterTypes() {
    return Object.keys(MONSTER_TYPES);
}

/**
 * Get monster info by type key
 */
export function getMonsterInfo(typeKey) {
    return MONSTER_TYPES[typeKey] || null;
}

/**
 * Randomly select a monster type based on weights
 */
export function selectRandomMonsterType() {
    const types = Object.entries(MONSTER_TYPES);
    const totalWeight = types.reduce((sum, [_, info]) => sum + info.weight, 0);
    
    let random = Math.random() * totalWeight;
    
    for (const [key, info] of types) {
        random -= info.weight;
        if (random <= 0) {
            currentMonsterType = key;
            return key;
        }
    }
    
    // Fallback
    currentMonsterType = 'KRAKEN';
    return 'KRAKEN';
}

/**
 * Get the currently selected monster type
 */
export function getCurrentMonsterType() {
    return currentMonsterType;
}

/**
 * Get info about the currently selected monster
 */
export function getCurrentMonsterInfo() {
    if (!currentMonsterType) return null;
    return MONSTER_TYPES[currentMonsterType];
}

/**
 * Create a monster instance of the specified type
 * @param {string} typeKey - Monster type key (e.g., 'GAZER')
 * @param {number} x - Spawn X position
 * @param {number} y - Spawn Y position
 * @param {object} map - Game map reference
 * @param {object} game - Game reference (for Sentinel screen shake)
 * @returns {BaseMonster} Monster instance
 */
export function createMonster(typeKey, x, y, map, game = null) {
    const monsterInfo = MONSTER_TYPES[typeKey];
    
    if (!monsterInfo) {
        console.warn(`Unknown monster type: ${typeKey}, defaulting to Kraken`);
        return new Kraken(x, y, map);
    }
    
    const MonsterClass = monsterInfo.class;
    
    // Special handling for different monster types
    if (typeKey === 'FRACTURE') {
        // Fracture needs a reference to track all instances
        const fractures = [];
        const monster = new MonsterClass(x, y, map, 0, fractures);
        fractures.push(monster);
        monster._fractureArray = fractures; // Store reference for game state
        return monster;
    }
    
    if (typeKey === 'SENTINEL') {
        return new MonsterClass(x, y, map, game);
    }
    
    return new MonsterClass(x, y, map);
}

/**
 * Create a monster of the currently selected type
 */
export function createCurrentMonster(x, y, map, game = null) {
    if (!currentMonsterType) {
        selectRandomMonsterType();
    }
    return createMonster(currentMonsterType, x, y, map, game);
}

/**
 * Force select a specific monster type (for testing/debug)
 */
export function forceMonsterType(typeKey) {
    if (MONSTER_TYPES[typeKey]) {
        currentMonsterType = typeKey;
        return true;
    }
    return false;
}

/**
 * Reset monster selection (call before new game)
 */
export function resetMonsterSelection() {
    currentMonsterType = null;
}

// Export monster classes for direct use if needed
export { Kraken, Gazer, Phantom, Echo, Mimic, Fracture, Sentinel };
