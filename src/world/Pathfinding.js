export class AStar {
    constructor(map) {
        this.map = map;
    }
    
    findPath(startX, startY, endX, endY, closedDoors = []) {
        const start = { x: Math.floor(startX), y: Math.floor(startY) };
        const end = { x: Math.floor(endX), y: Math.floor(endY) };
        
        if (!this.isWalkable(end.x, end.y, closedDoors)) {
            // Find nearest walkable tile to end
            const nearest = this.findNearestWalkable(end.x, end.y, closedDoors);
            if (nearest) {
                end.x = nearest.x;
                end.y = nearest.y;
            } else {
                return [];
            }
        }
        
        const openSet = [start];
        const cameFrom = new Map();
        
        const gScore = new Map();
        gScore.set(this.key(start.x, start.y), 0);
        
        const fScore = new Map();
        fScore.set(this.key(start.x, start.y), this.heuristic(start, end));
        
        const closedSet = new Set();
        
        while (openSet.length > 0) {
            // Get node with lowest fScore
            openSet.sort((a, b) => {
                const fA = fScore.get(this.key(a.x, a.y)) || Infinity;
                const fB = fScore.get(this.key(b.x, b.y)) || Infinity;
                return fA - fB;
            });
            
            const current = openSet.shift();
            const currentKey = this.key(current.x, current.y);
            
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }
            
            closedSet.add(currentKey);
            
            const neighbors = this.getNeighbors(current.x, current.y, closedDoors);
            
            for (const neighbor of neighbors) {
                const neighborKey = this.key(neighbor.x, neighbor.y);
                
                if (closedSet.has(neighborKey)) continue;
                
                const tentativeG = (gScore.get(currentKey) || Infinity) + neighbor.cost;
                
                const existingG = gScore.get(neighborKey);
                if (existingG === undefined || tentativeG < existingG) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + this.heuristic(neighbor, end));
                    
                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        
        return []; // No path found
    }
    
    key(x, y) {
        return `${x},${y}`;
    }
    
    heuristic(a, b) {
        // Manhattan distance
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    isWalkable(x, y, closedDoors = []) {
        // Monsters can't walk through vents (tile 2)
        if (!this.map.isWalkableForMonster(x, y)) return false;
        
        for (const door of closedDoors) {
            if (door.blocksPosition(x, y)) return false;
        }
        
        return true;
    }
    
    findNearestWalkable(x, y, closedDoors) {
        const checked = new Set();
        const queue = [{ x, y, dist: 0 }];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = this.key(current.x, current.y);
            
            if (checked.has(key)) continue;
            checked.add(key);
            
            if (this.isWalkable(current.x, current.y, closedDoors)) {
                return current;
            }
            
            if (current.dist < 10) {
                const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
                for (const [dx, dy] of dirs) {
                    queue.push({ x: current.x + dx, y: current.y + dy, dist: current.dist + 1 });
                }
            }
        }
        
        return null;
    }
    
    getNeighbors(x, y, closedDoors) {
        const neighbors = [];
        const dirs = [
            { dx: 0, dy: -1, cost: 1 },
            { dx: 1, dy: 0, cost: 1 },
            { dx: 0, dy: 1, cost: 1 },
            { dx: -1, dy: 0, cost: 1 },
            // Diagonals (slightly higher cost)
            { dx: 1, dy: -1, cost: 1.4 },
            { dx: 1, dy: 1, cost: 1.4 },
            { dx: -1, dy: 1, cost: 1.4 },
            { dx: -1, dy: -1, cost: 1.4 },
        ];
        
        for (const dir of dirs) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            if (this.isWalkable(nx, ny, closedDoors)) {
                // For diagonals, check that we can actually move diagonally
                if (Math.abs(dir.dx) + Math.abs(dir.dy) === 2) {
                    if (!this.isWalkable(x + dir.dx, y, closedDoors) || 
                        !this.isWalkable(x, y + dir.dy, closedDoors)) {
                        continue;
                    }
                }
                neighbors.push({ x: nx, y: ny, cost: dir.cost });
            }
        }
        
        return neighbors;
    }
    
    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = this.key(current.x, current.y);
        
        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            currentKey = this.key(current.x, current.y);
            path.unshift(current);
        }
        
        return path;
    }
}
