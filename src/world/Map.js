import { CONFIG } from '../main.js';

// ============================================
// MAP THEMES
// ============================================
const THEMES = {
    FACILITY: {
        wallColor: '#1a1a2e',
        wallBorderColor: '#2a2a4e',
        wallHighlightColor: '#3a3a5e',
        floorBaseRGB: { r: 25, g: 25, b: 35 }, // Dark blue-ish grey
        gridColor: 'rgba(50, 50, 70, 0.3)',
        detailColor: 'rgba(60, 60, 80, 0.4)',
        floorType: 'clean'
    },
    WAREHOUSE: {
        wallColor: '#2c3e50',
        wallBorderColor: '#34495e',
        wallHighlightColor: '#4a6b8a',
        floorBaseRGB: { r: 45, g: 45, b: 45 }, // Concrete grey
        gridColor: 'rgba(70, 70, 70, 0.3)',
        detailColor: 'rgba(100, 100, 100, 0.2)',
        floorType: 'concrete',
        hazardStripes: true
    },
    POWER_PLANT: {
        wallColor: '#1a1a1a',
        wallBorderColor: '#333333',
        wallHighlightColor: '#e67e22', // Orange accents
        floorBaseRGB: { r: 20, g: 20, b: 20 }, // Very dark
        gridColor: 'rgba(230, 126, 34, 0.1)', // Orange tint
        detailColor: 'rgba(230, 126, 34, 0.2)',
        floorType: 'metal_grate'
    },
    OFFICE: {
        wallColor: '#5a6a6b',
        wallBorderColor: '#4a5a5b',
        wallHighlightColor: '#7a8a8b',
        floorBaseRGB: { r: 100, g: 100, b: 95 }, // Darker carpet
        gridColor: 'rgba(80, 80, 80, 0.3)',
        detailColor: 'rgba(60, 60, 60, 0.2)',
        floorType: 'carpet'
    },
    SEWERS: {
        wallColor: '#2e2718', // Muddy brown/green
        wallBorderColor: '#3e3420',
        wallHighlightColor: '#4a4025',
        floorBaseRGB: { r: 35, g: 45, b: 30 }, // Sludge green
        gridColor: 'rgba(50, 100, 50, 0.1)',
        detailColor: 'rgba(40, 80, 40, 0.2)',
        floorType: 'wet'
    },
    CORPORATE: {
        wallColor: '#3a3a4a',
        wallBorderColor: '#4a4a5a',
        wallHighlightColor: '#5a5a6a',
        floorBaseRGB: { r: 60, g: 55, b: 50 }, // Wood-like floor
        gridColor: 'rgba(90, 85, 80, 0.3)',
        detailColor: 'rgba(70, 65, 60, 0.2)',
        floorType: 'wood'
    }
};

// ============================================
// MAP 1: FACILITY - Maze with proper chokepoints
// ============================================
const MAP_1 = {
    name: 'Facility',
    theme: THEMES.FACILITY,
    // 40 x 25 tiles
    data: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    generatorSpawns: [
        { x: 5, y: 3 }, { x: 34, y: 3 },
        { x: 5, y: 8 }, { x: 34, y: 8 },
        { x: 19, y: 8 }, { x: 19, y: 16 },
        { x: 5, y: 21 }, { x: 34, y: 21 },
        { x: 7, y: 12 }, { x: 32, y: 12 },
    ],
    doors: [
        { x: 10, y: 6, orientation: 'horizontal' },
        { x: 28, y: 6, orientation: 'horizontal' },
        { x: 10, y: 18, orientation: 'horizontal' },
        { x: 28, y: 18, orientation: 'horizontal' },
    ],
    exit: { x: 38, y: 22 },
};

// ============================================
// MAP 2: WAREHOUSE - Industrial layout
// ============================================
const MAP_2 = {
    name: 'Warehouse',
    theme: THEMES.WAREHOUSE,
    data: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    generatorSpawns: [
        { x: 6, y: 5 }, { x: 33, y: 5 },
        { x: 6, y: 18 }, { x: 33, y: 18 },
        { x: 19, y: 5 }, { x: 19, y: 18 },
        { x: 5, y: 10 }, { x: 34, y: 10 },
        { x: 5, y: 14 }, { x: 34, y: 14 },
    ],
    doors: [
        { x: 12, y: 8, orientation: 'horizontal' },
        { x: 26, y: 8, orientation: 'horizontal' },
        { x: 8, y: 12, orientation: 'horizontal' },
        { x: 30, y: 12, orientation: 'horizontal' },
    ],
    exit: { x: 38, y: 22 },
};

// ============================================
// MAP 3: POWER PLANT - Large central generator room with conveyor belts
// ============================================
const MAP_3 = {
    name: 'Power Plant',
    theme: THEMES.POWER_PLANT,
    data: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    generatorSpawns: [
        { x: 19, y: 12 },
        { x: 12, y: 12 }, { x: 26, y: 12 },
        { x: 6, y: 9 }, { x: 33, y: 9 },
        { x: 6, y: 15 }, { x: 33, y: 15 },
        { x: 19, y: 2 }, { x: 19, y: 22 },
    ],
    doors: [
        { x: 5, y: 4, orientation: 'horizontal' },
        { x: 33, y: 4, orientation: 'horizontal' },
        { x: 12, y: 7, orientation: 'horizontal' },
        { x: 26, y: 7, orientation: 'horizontal' },
        { x: 12, y: 17, orientation: 'horizontal' },
        { x: 26, y: 17, orientation: 'horizontal' },
        { x: 5, y: 20, orientation: 'horizontal' },
        { x: 33, y: 20, orientation: 'horizontal' },
    ],
    zones: [
        { x: 1, y: 5, width: 38, height: 2, type: 'conveyor_right' },
        { x: 1, y: 18, width: 38, height: 2, type: 'conveyor_left' },
    ],
    exit: { x: 38, y: 22 },
};

// ============================================
// MAP 4: RESEARCH LAB - Office cubicles and lab rooms
// ============================================
const MAP_4 = {
    name: 'Research Lab',
    theme: THEMES.OFFICE,
    data: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    generatorSpawns: [
        { x: 4, y: 2 }, { x: 35, y: 2 },
        { x: 19, y: 7 },
        { x: 6, y: 11 }, { x: 33, y: 11 },
        { x: 19, y: 12 },
        { x: 6, y: 13 }, { x: 33, y: 13 },
        { x: 4, y: 22 }, { x: 35, y: 22 },
    ],
    doors: [
        { x: 6, y: 5, orientation: 'horizontal' },
        { x: 32, y: 5, orientation: 'horizontal' },
        { x: 14, y: 5, orientation: 'horizontal' },
        { x: 24, y: 5, orientation: 'horizontal' },
        { x: 6, y: 19, orientation: 'horizontal' },
        { x: 32, y: 19, orientation: 'horizontal' },
        { x: 14, y: 19, orientation: 'horizontal' },
        { x: 24, y: 19, orientation: 'horizontal' },
    ],
    cabinets: [
        { x: 2, y: 2 },
        { x: 37, y: 3 },
        { x: 5, y: 12 },
        { x: 34, y: 12 },
        { x: 2, y: 22 },
        { x: 37, y: 21 },
    ],
    exit: { x: 38, y: 12 },
};

// ============================================
// MAP 5: SEWERS - Winding tunnels with junction rooms
// ============================================
const MAP_5 = {
    name: 'Sewers',
    theme: THEMES.SEWERS,
    data: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    generatorSpawns: [
        { x: 2, y: 2 }, { x: 37, y: 2 },
        { x: 19, y: 5 },
        { x: 8, y: 8 }, { x: 31, y: 8 },
        { x: 19, y: 12 },
        { x: 8, y: 16 }, { x: 31, y: 16 },
        { x: 2, y: 22 }, { x: 37, y: 22 },
    ],
    doors: [
        { x: 14, y: 4, orientation: 'horizontal' },
        { x: 24, y: 4, orientation: 'horizontal' },
        { x: 3, y: 7, orientation: 'horizontal' },
        { x: 35, y: 7, orientation: 'horizontal' },
        { x: 3, y: 17, orientation: 'horizontal' },
        { x: 35, y: 17, orientation: 'horizontal' },
        { x: 14, y: 20, orientation: 'horizontal' },
        { x: 24, y: 20, orientation: 'horizontal' },
    ],
    exit: { x: 19, y: 22 },
};

// ============================================
// MAP 6: CORPORATE OFFICE - Office with vents
// Tile 2 = vent (player can walk through, monsters cannot)
// ============================================
const MAP_6 = {
    name: 'Corporate Office',
    theme: THEMES.CORPORATE,
    data: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,2,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,2,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,2,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,2,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    generatorSpawns: [
        { x: 4, y: 2 }, { x: 35, y: 2 },
        { x: 4, y: 7 }, { x: 35, y: 7 },
        { x: 19, y: 7 },
        { x: 6, y: 12 }, { x: 33, y: 12 },
        { x: 19, y: 12 },
        { x: 4, y: 17 }, { x: 35, y: 17 },
        { x: 4, y: 22 }, { x: 35, y: 22 },
    ],
    doors: [
        { x: 6, y: 5, orientation: 'horizontal' },
        { x: 32, y: 5, orientation: 'horizontal' },
        { x: 14, y: 5, orientation: 'horizontal' },
        { x: 24, y: 5, orientation: 'horizontal' },
        { x: 6, y: 19, orientation: 'horizontal' },
        { x: 32, y: 19, orientation: 'horizontal' },
        { x: 14, y: 19, orientation: 'horizontal' },
        { x: 24, y: 19, orientation: 'horizontal' },
    ],
    exit: { x: 38, y: 12 },
};

// All available maps
export const MAPS = [MAP_1, MAP_2, MAP_3, MAP_4, MAP_5, MAP_6];

// Get a random map
export function getRandomMap() {
    return MAPS[Math.floor(Math.random() * MAPS.length)];
}

// Legacy exports for compatibility - using MAP_1 as default fallback
export const GENERATOR_SPAWN_POINTS = MAP_1.generatorSpawns;
export const DOOR_POSITIONS = MAP_1.doors;
export const EXIT_POSITION = MAP_1.exit;

export class GameMap {
    constructor(mapConfig = null, mirrorMode = false) {
        // Use provided map config or pick random
        this.mapConfig = mapConfig || getRandomMap();
        this.mirrorMode = mirrorMode;
        
        // Mirror the map data if in mirror mode
        if (mirrorMode) {
            this.data = this.mapConfig.data.map(row => [...row].reverse());
        } else {
            this.data = this.mapConfig.data;
        }
        
        this.width = this.data[0].length;
        this.height = this.data.length;
        this.tileSize = CONFIG.TILE_SIZE;
        this.name = this.mapConfig.name + (mirrorMode ? ' (Mirrored)' : '');
        
        // Apply theme from config or default to FACILITY
        this.theme = this.mapConfig.theme || THEMES.FACILITY;
        
        // Precompute floor pattern
        this.floorPattern = this.generateFloorPattern();
    }
    
    generateFloorPattern() {
        const pattern = [];
        for (let y = 0; y < this.height; y++) {
            pattern[y] = [];
            for (let x = 0; x < this.width; x++) {
                pattern[y][x] = {
                    brightness: 0.95 + Math.random() * 0.1,
                    hasLine: Math.random() < 0.1,
                    lineAngle: Math.random() * Math.PI,
                    variant: Math.floor(Math.random() * 3), // For different tile textures
                };
            }
        }
        return pattern;
    }
    
    isWall(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return true;
        }
        const tile = this.data[tileY][tileX];
        return tile === 1 || tile === 99; // Regular wall or barricade
    }
    
    isBarricade(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }
        return this.data[tileY][tileX] === 99;
    }
    
    isVent(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }
        return this.data[tileY][tileX] === 2;
    }
    
    // Player can walk through floor (0) and vents (2)
    isWalkable(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }
        const tile = this.data[tileY][tileX];
        return tile === 0 || tile === 2; // Floor or vent
    }
    
    // Monsters can only walk through floor (0), not vents
    isWalkableForMonster(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }
        // Check temporary walls (barricades)
        if (this.temporaryWalls && this.temporaryWalls[`${tileX},${tileY}`]) {
            return false;
        }
        return this.data[tileY][tileX] === 0;
    }
    
    // Set or clear a temporary wall (used by barricade ability)
    setTemporaryWall(tileX, tileY, isWall) {
        if (!this.temporaryWalls) {
            this.temporaryWalls = {};
        }
        const key = `${tileX},${tileY}`;
        if (isWall) {
            this.temporaryWalls[key] = true;
        } else {
            delete this.temporaryWalls[key];
        }
    }
    
    // Clear a temporary wall
    clearTemporaryWall(tileX, tileY) {
        this.setTemporaryWall(tileX, tileY, false);
    }
    
    worldToTile(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldY / this.tileSize),
        };
    }
    
    tileToWorld(tileX, tileY) {
        return {
            x: tileX * this.tileSize + this.tileSize / 2,
            y: tileY * this.tileSize + this.tileSize / 2,
        };
    }
    
    // Check if a world position is in a puddle (wet floor with variant 0)
    isInPuddle(worldX, worldY) {
        // Only sewers (wet floor type) have puddles
        if (this.theme.floorType !== 'wet') return false;
        
        const tile = this.worldToTile(worldX, worldY);
        
        // Check bounds
        if (tile.x < 0 || tile.x >= this.width || tile.y < 0 || tile.y >= this.height) {
            return false;
        }
        
        // Check if this tile is walkable and has a puddle (variant 0)
        if (this.isWalkable(tile.x, tile.y) && this.floorPattern[tile.y][tile.x].variant === 0) {
            return true;
        }
        return false;
    }
    
    render(ctx) {
        const ts = this.tileSize;
        const t = this.theme;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const px = x * ts;
                const py = y * ts;
                
                const tileValue = this.data[y][x];
                
                if (tileValue === 1) {
                    // Wall
                    ctx.fillStyle = t.wallColor;
                    ctx.fillRect(px, py, ts, ts);
                    
                    // Edge highlights
                    ctx.strokeStyle = t.wallBorderColor;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
                    
                    // Top highlight (3D effect)
                    if (y > 0 && this.data[y - 1][x] === 0) {
                        ctx.fillStyle = t.wallHighlightColor;
                        ctx.fillRect(px, py, ts, 4);
                    }
                } else if (tileValue === 2) {
                    // Vent - looks like a grate in the wall
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(px, py, ts, ts);
                    
                    // Vent grate lines
                    ctx.strokeStyle = '#3a3a3a';
                    ctx.lineWidth = 2;
                    for (let i = 4; i < ts; i += 6) {
                        ctx.beginPath();
                        ctx.moveTo(px + i, py + 2);
                        ctx.lineTo(px + i, py + ts - 2);
                        ctx.stroke();
                    }
                    
                    // Border
                    ctx.strokeStyle = '#4a4a4a';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);
                } else {
                    // Floor
                    const pattern = this.floorPattern[y][x];
                    
                    // Base color mixed with pattern brightness
                    const r = Math.floor(t.floorBaseRGB.r * pattern.brightness);
                    const g = Math.floor(t.floorBaseRGB.g * pattern.brightness);
                    const b = Math.floor(t.floorBaseRGB.b * pattern.brightness);
                    
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.fillRect(px, py, ts, ts);
                    
                    // Grid lines
                    ctx.strokeStyle = t.gridColor;
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(px, py, ts, ts);
                    
                    // Detail based on theme type
                    if (t.floorType === 'concrete') {
                         // Random noise/texture
                         if (pattern.hasLine) {
                            ctx.fillStyle = t.detailColor;
                            ctx.fillRect(px + Math.random() * ts, py + Math.random() * ts, 2, 2);
                         }
                    } else if (t.floorType === 'metal_grate') {
                        // Cross hatch
                        ctx.strokeStyle = t.detailColor;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.lineTo(px + ts, py + ts);
                        ctx.moveTo(px + ts, py);
                        ctx.lineTo(px, py + ts);
                        ctx.stroke();
                    } else if (t.floorType === 'carpet') {
                        // Soft noise
                        if (pattern.variant === 0) {
                            ctx.fillStyle = t.detailColor;
                            ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
                        }
                    } else if (t.floorType === 'wet') {
                        // Puddles
                        if (pattern.variant === 0) {
                            ctx.fillStyle = 'rgba(50, 60, 40, 0.3)';
                            ctx.beginPath();
                            ctx.ellipse(px + ts/2, py + ts/2, ts/3, ts/4, pattern.lineAngle, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else if (t.floorType === 'wood') {
                        // Wood plank lines
                        ctx.strokeStyle = t.detailColor;
                        ctx.lineWidth = 1;
                        // Horizontal wood grain lines
                        if (y % 2 === 0) {
                            ctx.beginPath();
                            ctx.moveTo(px, py + ts/3);
                            ctx.lineTo(px + ts, py + ts/3);
                            ctx.moveTo(px, py + ts*2/3);
                            ctx.lineTo(px + ts, py + ts*2/3);
                            ctx.stroke();
                        }
                    } else {
                        // Standard clean lines
                        if (pattern.hasLine) {
                            ctx.strokeStyle = t.detailColor;
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(px + 5, py + ts / 2);
                            ctx.lineTo(px + ts - 5, py + ts / 2);
                            ctx.stroke();
                        }
                    }
                    
                    // Hazard stripes for warehouse/industrial themes
                    if (t.hazardStripes) {
                        // Draw hazard stripes near walls
                        let nearWall = false;
                        if (x > 0 && this.data[y][x-1] === 1) nearWall = true;
                        if (x < this.width-1 && this.data[y][x+1] === 1) nearWall = true;
                        
                        if (nearWall && pattern.variant === 0) {
                             ctx.fillStyle = 'rgba(241, 196, 15, 0.2)'; // Yellow warning
                             ctx.fillRect(px, py + ts - 5, ts, 5);
                        }
                    }
                }
            }
        }
        
        // Render conveyor belts if they exist
        if (this.mapConfig.zones) {
            for (const zone of this.mapConfig.zones) {
                if (zone.type.startsWith('conveyor')) {
                    const zx = zone.x * ts;
                    const zy = zone.y * ts;
                    const zw = zone.width * ts;
                    const zh = zone.height * ts;
                    
                    // Semi-transparent overlay
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.fillRect(zx, zy, zw, zh);
                    
                    // Moving arrows visual
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
                    ctx.lineWidth = 2;
                    
                    // Fix: Offset wrap must match arrow spacing (40) to prevent visual jumps
                    const offset = (performance.now() / 20) % 40;
                    
                    ctx.beginPath();
                    if (zone.type === 'conveyor_right') {
                        for (let i = 0; i < zw; i += 40) {
                            const x = zx + (i + offset) % zw;
                            if (x < zx + zw) {
                                ctx.moveTo(x, zy + 10);
                                ctx.lineTo(x + 10, zy + zh/2);
                                ctx.lineTo(x, zy + zh - 10);
                            }
                        }
                    } else if (zone.type === 'conveyor_left') {
                        for (let i = zw; i > 0; i -= 40) {
                            const x = zx + (i - offset + zw) % zw;
                            if (x > zx) {
                                ctx.moveTo(x, zy + 10);
                                ctx.lineTo(x - 10, zy + zh/2);
                                ctx.lineTo(x, zy + zh - 10);
                            }
                        }
                    }
                    ctx.stroke();
                }
            }
        }
    }
}
