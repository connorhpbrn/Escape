import { CONFIG } from '../main.js';

export function checkCollision(x, y, size, map, doors = [], isMonster = false) {
    const halfSize = size / 2;
    const ts = CONFIG.TILE_SIZE;
    
    // Check corners of the entity's bounding box
    const corners = [
        { x: x - halfSize, y: y - halfSize },
        { x: x + halfSize, y: y - halfSize },
        { x: x - halfSize, y: y + halfSize },
        { x: x + halfSize, y: y + halfSize },
    ];
    
    for (const corner of corners) {
        const tileX = Math.floor(corner.x / ts);
        const tileY = Math.floor(corner.y / ts);
        
        // Monsters can't walk through vents, players can
        if (isMonster) {
            if (!map.isWalkableForMonster(tileX, tileY)) {
                return true;
            }
        } else {
            if (map.isWall(tileX, tileY)) {
                return true;
            }
        }
        
        // Check closed doors
        for (const door of doors) {
            if (door.isClosed && door.blocksPosition(tileX, tileY)) {
                return true;
            }
        }
    }
    
    return false;
}

export function resolveCollision(x, y, vx, vy, size, map, doors = [], isMonster = false) {
    const halfSize = size / 2;
    const ts = CONFIG.TILE_SIZE;
    
    let newX = x + vx;
    let newY = y + vy;
    
    // Try X movement
    if (checkCollision(newX, y, size, map, doors, isMonster)) {
        // Slide along wall
        const tileX = Math.floor((newX + (vx > 0 ? halfSize : -halfSize)) / ts);
        if (vx > 0) {
            newX = tileX * ts - halfSize - 0.1;
        } else {
            newX = (tileX + 1) * ts + halfSize + 0.1;
        }
    }
    
    // Try Y movement
    if (checkCollision(newX, newY, size, map, doors, isMonster)) {
        const tileY = Math.floor((newY + (vy > 0 ? halfSize : -halfSize)) / ts);
        if (vy > 0) {
            newY = tileY * ts - halfSize - 0.1;
        } else {
            newY = (tileY + 1) * ts + halfSize + 0.1;
        }
    }
    
    // Final check
    if (checkCollision(newX, newY, size, map, doors, isMonster)) {
        return { x, y };
    }
    
    return { x: newX, y: newY };
}

export function lineOfSight(x1, y1, x2, y2, map) {
    const ts = CONFIG.TILE_SIZE;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / (ts / 2));
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + dx * t;
        const y = y1 + dy * t;
        
        const tileX = Math.floor(x / ts);
        const tileY = Math.floor(y / ts);
        
        if (map.isWall(tileX, tileY)) {
            return false;
        }
    }
    
    return true;
}

export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}
