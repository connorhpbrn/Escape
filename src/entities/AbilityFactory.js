import { CONFIG } from '../main.js';

// ============================================
// ABILITY FACTORY
// Defines player abilities and their effects
// ============================================

// Ability definitions
const ABILITIES = {
    DASH: {
        name: 'Dash',
        description: 'Phase through walls briefly',
        icon: '',
        color: '#00bfff',
        cooldown: 8.0,
        duration: 0.2, // Smoother duration
        // Dash specific
        dashSpeed: 800, // Adjusted for smooth slide
    },
    SURGE: {
        name: 'Surge',
        description: 'Speed boost, louder footsteps',
        icon: '',
        color: '#ff6b6b',
        cooldown: 12.0,
        duration: 4.0,
        // Surge specific
        speedMultiplier: 1.8,
        footstepMultiplier: 3.0, // How much louder footsteps are
    },
    PULSE: {
        name: 'Pulse',
        description: 'Reveal the entire map',
        icon: '',
        color: '#ffd93d',
        cooldown: 15.0,
        duration: 2.0,
    },
    BARRICADE: {
        name: 'Barricade',
        description: 'Place temporary walls',
        icon: '',
        color: '#4caf50',
        cooldown: 10.0,
        duration: 5.0, // How long barricade lasts
    },
    DECOY: {
        name: 'Decoy',
        description: 'Lure monsters away',
        icon: '',
        color: '#ff9500',
        cooldown: 12.0,
        duration: 5.0, // How long decoy lasts (DECOY_LURE_TIME)
    },
};

// Current selected ability type
let currentAbilityType = null;

/**
 * Get all available ability types
 */
export function getAbilityTypes() {
    return Object.keys(ABILITIES);
}

/**
 * Get ability info by type key
 */
export function getAbilityInfo(typeKey) {
    return ABILITIES[typeKey] || null;
}

/**
 * Randomly select an ability type
 */
export function selectRandomAbilityType() {
    const types = Object.keys(ABILITIES);
    const randomIndex = Math.floor(Math.random() * types.length);
    currentAbilityType = types[randomIndex];
    return currentAbilityType;
}

/**
 * Get the currently selected ability type
 */
export function getCurrentAbilityType() {
    return currentAbilityType;
}

/**
 * Get info about the currently selected ability
 */
export function getCurrentAbilityInfo() {
    if (!currentAbilityType) return null;
    return ABILITIES[currentAbilityType];
}

/**
 * Force select a specific ability type
 */
export function forceAbilityType(typeKey) {
    if (ABILITIES[typeKey]) {
        currentAbilityType = typeKey;
        return true;
    }
    return false;
}

/**
 * Reset ability selection
 */
export function resetAbilitySelection() {
    currentAbilityType = null;
}

// Export for direct access
export { ABILITIES };
